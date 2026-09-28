const { query } = require('../db');
const Company = require('../models/company');
const Equipment = require('../models/equipment');
const EquipmentMonitor = require('../models/equipmentMonitor');
const Incident = require('../models/incident');
const Notification = require('../models/notification');
const OperatingHours = require('../models/operatingHours');
const {
  isHourUnit, planAlert, planDowntime, splitHours, workingHoursDelta,
} = require('../utils/monitoringOps');

function canSeeEquipment(row) {
  if (row.role === 'admin') return true;
  let permissions = row.permissions;
  if (typeof permissions === 'string') {
    try { permissions = JSON.parse(permissions); } catch { permissions = null; }
  }
  const permission = permissions?.equipment;
  return permission === true || permission === 'view' || permission === 'full' || permission === 'edit';
}

async function notifyUsers(companyId) {
  const { rows } = await query(
    `SELECT u.id, u.role, p.permissions
     FROM users u
     LEFT JOIN positions p ON p.id = u.position_id
     WHERE u.company_id = $1 AND COALESCE(u.role, '') <> 'superadmin'`,
    [companyId],
  );
  const allowed = rows.filter(canSeeEquipment);
  return (allowed.length ? allowed : rows).map((row) => row.id);
}

async function applyPollEffects(link, reading, context, now = new Date()) {
  const previous = context?.previous;
  const prior = context?.priorSample;
  const company = await Company.get(link.companyId);
  const threshold = company.monitoringAlertMinutes || 5;
  const staleMs = Math.max(60, link.pollIntervalSec * 2) * 1000;
  const previousState = prior?.state || previous?.lastState || null;

  if (prior) {
    const delta = workingHoursDelta({
      previousState: prior.state,
      gapMs: now.getTime() - new Date(prior.observedAt).getTime(),
      staleMs,
    });
    const hours = delta > 0 ? await OperatingHours.getByEquipmentId(link.equipmentId) : null;
    if (hours && isHourUnit(hours.unit)) {
      const split = splitHours(previous?.hoursRemainder || 0, delta);
      if (split.applied > 0) await OperatingHours.addValue(link.equipmentId, split.applied);
      await EquipmentMonitor.setHoursRemainder(link.equipmentId, split.remainder);
    }
  }

  const open = await EquipmentMonitor.openDowntime(link.equipmentId);
  const actions = planDowntime({ openState: open?.state || null, state: reading.state });
  for (const action of actions) {
    if (action.type === 'close' && open) await EquipmentMonitor.closeDowntime(open.id, now);
    if (action.type === 'open') {
      await EquipmentMonitor.startDowntime({
        companyId: link.companyId,
        equipmentId: link.equipmentId,
        state: action.state,
        startedAt: now,
      });
    }
  }

  const plan = planAlert({
    previousState,
    state: reading.state,
    alertSince: previous?.alertSince,
    alertNotified: previous?.alertNotified,
    now,
    thresholdMinutes: threshold,
  });
  let incidentId = plan.alertSince ? previous?.alertIncidentId : null;
  if (plan.notify) {
    const equipment = await Equipment.findById(link.equipmentId, link.companyId);
    const name = equipment?.name || 'Станок';
    const inventory = equipment?.inventoryNumber ? ` (${equipment.inventoryNumber})` : '';
    const title = plan.kind === 'fault' ? `Авария: ${name}` : `Нет связи: ${name}`;
    const message = plan.kind === 'fault'
      ? `${name}${inventory} в аварии дольше ${threshold} мин.`
      : `${name}${inventory} без связи дольше ${threshold} мин.`;
    if (plan.kind === 'fault') {
      const openIncidents = await Incident.countOpenByEquipment(link.equipmentId, link.companyId);
      if (!incidentId || openIncidents === 0) {
        const incident = await Incident.create({
          equipmentId: link.equipmentId,
          employeeName: 'Мониторинг',
          description: message,
        }, link.companyId);
        incidentId = incident.id;
      }
    }
    const users = await notifyUsers(link.companyId);
    for (const userId of users) {
      await Notification.create({
        userId,
        type: plan.kind === 'fault' ? 'monitor_fault' : 'monitor_offline',
        title,
        message,
        equipmentId: link.equipmentId,
        incidentId: plan.kind === 'fault' ? incidentId : null,
      });
    }
  }
  await EquipmentMonitor.setAlert(link.equipmentId, {
    alertSince: plan.alertSince,
    alertNotified: plan.alertNotified,
    alertIncidentId: incidentId,
  });
}

module.exports = { applyPollEffects, canSeeEquipment };
