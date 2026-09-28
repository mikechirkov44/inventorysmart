import { monitoringAPI } from '../api';
import { demoMonitoringSource } from './demoSource';

let liveIds = new Set();
let loaded = null;

async function ensureLiveIds() {
  if (!loaded) {
    loaded = monitoringAPI.live()
      .then((response) => { liveIds = new Set(response.data.equipmentIds || []); })
      .catch(() => { liveIds = new Set(); });
  }
  await loaded;
}

export function invalidateMonitoringSource() {
  loaded = null;
}

async function liveDay(equipmentId, date) {
  const response = await monitoringAPI.getDay(equipmentId, date);
  return response.data;
}

export const monitoringSource = {
  async getDay(equipmentId, date, now = new Date()) {
    await ensureLiveIds();
    if (!liveIds.has(equipmentId)) return demoMonitoringSource.getDay(equipmentId, date, now);
    return liveDay(equipmentId, date);
  },
  async getRange(equipmentIds, from, to, now = new Date()) {
    await ensureLiveIds();
    const live = equipmentIds.filter((id) => liveIds.has(id));
    const demo = equipmentIds.filter((id) => !liveIds.has(id));
    const [liveRows, demoRows] = await Promise.all([
      live.length ? monitoringAPI.getRange(live, from, to).then((response) => response.data) : [],
      demo.length ? demoMonitoringSource.getRange(demo, from, to, now) : [],
    ]);
    const byId = new Map([...liveRows, ...demoRows].map((row) => [row.equipmentId, row]));
    return equipmentIds.map((equipmentId) => byId.get(equipmentId));
  },
  async getSnapshot(equipmentId, now = new Date()) {
    await ensureLiveIds();
    if (!liveIds.has(equipmentId)) return demoMonitoringSource.getSnapshot(equipmentId, now);
    const response = await monitoringAPI.getSnapshot(equipmentId);
    return response.data;
  },
};
