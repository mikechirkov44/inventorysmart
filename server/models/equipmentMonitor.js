const { query } = require('../db');
const { buildDayFromSamples } = require('../utils/monitoringTimeline');
const { applyShiftView, offlineMinutes, segmentNeedsReason } = require('../utils/monitoringOps');
const Company = require('./company');

function mapLink(row) {
  if (!row) return null;
  return {
    equipmentId: row.equipment_id,
    companyId: row.company_id,
    enabled: row.enabled,
    host: row.host,
    port: row.port,
    unitId: row.unit_id,
    registerAddress: row.register_address,
    pollIntervalSec: row.poll_interval_sec,
    protocol: row.protocol || 'modbus',
    signal: row.signal || '',
    lastState: row.last_state,
    lastValue: row.last_value,
    lastPolledAt: row.last_polled_at,
    lastSuccessAt: row.last_success_at,
    lastError: row.last_error,
    alertSince: row.alert_since,
    alertNotified: row.alert_notified === true,
    alertIncidentId: row.alert_incident_id,
    hoursRemainder: Number(row.hours_remainder) || 0,
    template: row.protocol || 'modbus',
  };
}

function mapDowntime(row) {
  if (!row) return null;
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    state: row.state,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    causeId: row.cause_id,
    causeName: row.cause_name || '',
  };
}

function presentStatus(link, now, reasonPending) {
  const staleMs = Math.max(60, link.pollIntervalSec * 2) * 1000;
  const fresh = link.lastPolledAt && now.getTime() - new Date(link.lastPolledAt).getTime() <= staleMs;
  const state = fresh ? (link.lastState || 'unknown') : 'unknown';
  return {
    equipmentId: link.equipmentId,
    source: link.protocol || 'modbus',
    asOf: (link.lastPolledAt ? new Date(link.lastPolledAt) : now).toISOString(),
    state,
    lastError: link.lastError,
    lastPolledAt: link.lastPolledAt ? new Date(link.lastPolledAt).toISOString() : null,
    lastSuccessAt: link.lastSuccessAt ? new Date(link.lastSuccessAt).toISOString() : null,
    offlineMinutes: offlineMinutes({ state, lastSuccessAt: link.lastSuccessAt, now }),
    reasonPending: Boolean(reasonPending),
  };
}

const EquipmentMonitor = {
  async listEnabled() {
    const result = await query('SELECT * FROM equipment_monitor_links WHERE enabled = true AND host <> \'\'');
    return result.rows.map(mapLink);
  },

  async listLiveIds(companyId) {
    const result = await query(
      'SELECT equipment_id FROM equipment_monitor_links WHERE company_id = $1 AND enabled = true AND host <> \'\'',
      [companyId],
    );
    return result.rows.map((row) => row.equipment_id);
  },

  async find(companyId, equipmentId) {
    const result = await query(
      'SELECT * FROM equipment_monitor_links WHERE company_id = $1 AND equipment_id = $2',
      [companyId, equipmentId],
    );
    return mapLink(result.rows[0]);
  },

  async save(companyId, equipmentId, link) {
    const equipment = await query('SELECT id FROM equipment WHERE company_id = $1 AND id = $2', [companyId, equipmentId]);
    if (!equipment.rows[0]) return null;
    const result = await query(
      `INSERT INTO equipment_monitor_links
        (equipment_id, company_id, enabled, host, port, unit_id, register_address, poll_interval_sec, protocol, signal, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
       ON CONFLICT (equipment_id) DO UPDATE SET
        enabled = EXCLUDED.enabled, host = EXCLUDED.host, port = EXCLUDED.port,
        unit_id = EXCLUDED.unit_id, register_address = EXCLUDED.register_address,
        poll_interval_sec = EXCLUDED.poll_interval_sec, protocol = EXCLUDED.protocol,
        signal = EXCLUDED.signal, updated_at = NOW()
       RETURNING *`,
      [equipmentId, companyId, link.enabled, link.host, link.port, link.unitId, link.registerAddress, link.pollIntervalSec, link.protocol, link.signal || ''],
    );
    return mapLink(result.rows[0]);
  },

  async recordPoll(link, { state, value, error }) {
    const existing = await query('SELECT * FROM equipment_monitor_links WHERE equipment_id = $1', [link.equipmentId]);
    const prior = await query(
      `SELECT state, observed_at FROM equipment_monitor_samples
       WHERE equipment_id = $1 ORDER BY observed_at DESC LIMIT 1`,
      [link.equipmentId],
    );
    await query(
      `UPDATE equipment_monitor_links
       SET last_state = $2, last_value = $3, last_error = $4, last_polled_at = NOW(),
           last_success_at = CASE WHEN $4::text IS NULL THEN NOW() ELSE last_success_at END,
           updated_at = NOW()
       WHERE equipment_id = $1`,
      [link.equipmentId, state, Number.isInteger(value) ? value : null, error || null],
    );
    await query(
      'INSERT INTO equipment_monitor_samples (company_id, equipment_id, state) VALUES ($1, $2, $3)',
      [link.companyId, link.equipmentId, state],
    );
    return {
      previous: mapLink(existing.rows[0]),
      priorSample: prior.rows[0] ? { state: prior.rows[0].state, observedAt: prior.rows[0].observed_at } : null,
    };
  },

  async setAlert(equipmentId, { alertSince, alertNotified, alertIncidentId }) {
    await query(
      `UPDATE equipment_monitor_links
       SET alert_since = $2, alert_notified = $3, alert_incident_id = $4, updated_at = NOW()
       WHERE equipment_id = $1`,
      [equipmentId, alertSince, Boolean(alertNotified), alertIncidentId || null],
    );
  },

  async setHoursRemainder(equipmentId, remainder) {
    await query(
      'UPDATE equipment_monitor_links SET hours_remainder = $2, updated_at = NOW() WHERE equipment_id = $1',
      [equipmentId, remainder],
    );
  },

  async openDowntime(equipmentId) {
    const result = await query(
      `SELECT * FROM equipment_monitor_downtime
       WHERE equipment_id = $1 AND ended_at IS NULL
       ORDER BY started_at DESC LIMIT 1`,
      [equipmentId],
    );
    return mapDowntime(result.rows[0]);
  },

  async startDowntime({ companyId, equipmentId, state, startedAt }) {
    await query(
      `INSERT INTO equipment_monitor_downtime (company_id, equipment_id, state, started_at)
       VALUES ($1, $2, $3, $4)`,
      [companyId, equipmentId, state, startedAt],
    );
  },

  async closeDowntime(id, endedAt) {
    await query(
      'UPDATE equipment_monitor_downtime SET ended_at = $2 WHERE id = $1 AND ended_at IS NULL',
      [id, endedAt],
    );
  },

  async listStatuses(companyId, now = new Date()) {
    const company = await Company.get(companyId);
    const links = await query(
      `SELECT * FROM equipment_monitor_links
       WHERE company_id = $1 AND enabled = true AND host <> ''`,
      [companyId],
    );
    const pending = await query(
      `SELECT equipment_id, started_at, ended_at, cause_id
       FROM equipment_monitor_downtime
       WHERE company_id = $1 AND cause_id IS NULL`,
      [companyId],
    );
    const pendingIds = new Set(pending.rows
      .filter((row) => segmentNeedsReason({
        startedAt: row.started_at,
        endedAt: row.ended_at,
        causeId: row.cause_id,
      }, now, company.monitoringAlertMinutes))
      .map((row) => row.equipment_id));
    return links.rows.map((row) => presentStatus(mapLink(row), now, pendingIds.has(row.equipment_id)));
  },

  async downtimeFor(companyId, equipmentId, now = new Date()) {
    const company = await Company.get(companyId);
    const result = await query(
      `SELECT d.*, c.name AS cause_name
       FROM equipment_monitor_downtime d
       LEFT JOIN causes c ON c.id = d.cause_id
       WHERE d.company_id = $1 AND d.equipment_id = $2
       ORDER BY d.started_at DESC
       LIMIT 30`,
      [companyId, equipmentId],
    );
    const causes = await query('SELECT id, name FROM causes WHERE company_id = $1 ORDER BY name', [companyId]);
    const segments = result.rows.map(mapDowntime);
    return {
      pending: segments.filter((segment) => segmentNeedsReason(segment, now, company.monitoringAlertMinutes)),
      recent: segments.filter((segment) => segment.causeId).slice(0, 8),
      causes: causes.rows.map((row) => ({ id: row.id, name: row.name })),
    };
  },

  async assignCause(companyId, id, causeId) {
    const cause = await query('SELECT id FROM causes WHERE id = $1 AND company_id = $2', [causeId, companyId]);
    if (!cause.rows[0]) return null;
    const result = await query(
      `UPDATE equipment_monitor_downtime
       SET cause_id = $3
       WHERE id = $1 AND company_id = $2
       RETURNING id`,
      [id, companyId, causeId],
    );
    return result.rows[0] || null;
  },

  async samplesFor(equipmentId, fromIso, toIso) {
    const result = await query(
      `SELECT state, observed_at FROM equipment_monitor_samples
       WHERE equipment_id = $1 AND observed_at >= $2 AND observed_at < $3
       ORDER BY observed_at`,
      [equipmentId, fromIso, toIso],
    );
    const prior = await query(
      `SELECT state, observed_at FROM equipment_monitor_samples
       WHERE equipment_id = $1 AND observed_at < $2
       ORDER BY observed_at DESC LIMIT 1`,
      [equipmentId, fromIso],
    );
    return [...prior.rows, ...result.rows].map((row) => ({
      state: row.state,
      observedAt: row.observed_at,
    }));
  },

  async day(companyId, equipmentId, date, now = new Date(), mode = 'day') {
    const link = await this.find(companyId, equipmentId);
    if (!link?.enabled) return null;
    const start = new Date(`${date}T00:00:00+03:00`);
    const end = new Date(start.getTime() + 86400000);
    const samples = await this.samplesFor(equipmentId, start.toISOString(), end.toISOString());
    const day = buildDayFromSamples({
      equipmentId,
      date,
      samples,
      now,
      pollIntervalSec: link.pollIntervalSec,
      source: link.protocol || 'modbus',
    });
    if (mode !== 'shift') return day;
    const company = await Company.get(companyId);
    return applyShiftView(day, { start: company.shiftStart, end: company.shiftEnd, now });
  },

  async snapshot(companyId, equipmentId, now = new Date()) {
    const link = await this.find(companyId, equipmentId);
    if (!link?.enabled) return null;
    return presentStatus(link, now, false);
  },
};

module.exports = EquipmentMonitor;
