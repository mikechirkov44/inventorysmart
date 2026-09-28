const { query } = require('../db');
const { buildDayFromSamples } = require('../utils/monitoringTimeline');

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
    lastState: row.last_state,
    lastValue: row.last_value,
    lastPolledAt: row.last_polled_at,
    lastError: row.last_error,
    template: 'gateway_status',
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
        (equipment_id, company_id, enabled, host, port, unit_id, register_address, poll_interval_sec, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (equipment_id) DO UPDATE SET
        enabled = EXCLUDED.enabled, host = EXCLUDED.host, port = EXCLUDED.port,
        unit_id = EXCLUDED.unit_id, register_address = EXCLUDED.register_address,
        poll_interval_sec = EXCLUDED.poll_interval_sec, updated_at = NOW()
       RETURNING *`,
      [equipmentId, companyId, link.enabled, link.host, link.port, link.unitId, link.registerAddress, link.pollIntervalSec],
    );
    return mapLink(result.rows[0]);
  },

  async recordPoll(link, { state, value, error }) {
    await query(
      `UPDATE equipment_monitor_links
       SET last_state = $2, last_value = $3, last_error = $4, last_polled_at = NOW(), updated_at = NOW()
       WHERE equipment_id = $1`,
      [link.equipmentId, state, Number.isInteger(value) ? value : null, error || null],
    );
    await query(
      'INSERT INTO equipment_monitor_samples (company_id, equipment_id, state) VALUES ($1, $2, $3)',
      [link.companyId, link.equipmentId, state],
    );
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

  async day(companyId, equipmentId, date, now = new Date()) {
    const link = await this.find(companyId, equipmentId);
    if (!link?.enabled) return null;
    const start = new Date(`${date}T00:00:00+03:00`);
    const end = new Date(start.getTime() + 86400000);
    const samples = await this.samplesFor(equipmentId, start.toISOString(), end.toISOString());
    return buildDayFromSamples({
      equipmentId,
      date,
      samples,
      now,
      pollIntervalSec: link.pollIntervalSec,
    });
  },

  async snapshot(companyId, equipmentId, now = new Date()) {
    const link = await this.find(companyId, equipmentId);
    if (!link?.enabled) return null;
    const staleMs = Math.max(60, link.pollIntervalSec * 2) * 1000;
    const fresh = link.lastPolledAt && now.getTime() - new Date(link.lastPolledAt).getTime() <= staleMs;
    return {
      equipmentId,
      source: 'modbus',
      asOf: (link.lastPolledAt ? new Date(link.lastPolledAt) : now).toISOString(),
      state: fresh ? (link.lastState || 'unknown') : 'unknown',
      lastError: link.lastError,
    };
  },
};

module.exports = EquipmentMonitor;
