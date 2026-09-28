import { companyAPI, monitoringAPI } from '../api';
import { demoMonitoringSource, emptyMonitoringSource } from './demoSource';

let liveIds = new Set();
let loaded = null;
let demoEnabled = true;
let prefsLoaded = null;

async function ensureLiveIds() {
  if (!loaded) {
    loaded = monitoringAPI.live()
      .then((response) => { liveIds = new Set(response.data.equipmentIds || []); })
      .catch(() => { liveIds = new Set(); });
  }
  await loaded;
}

async function ensureDemoFlag() {
  if (!prefsLoaded) {
    prefsLoaded = companyAPI.get()
      .then((response) => { demoEnabled = response.data.monitoringDemoEnabled !== false; })
      .catch(() => { demoEnabled = true; });
  }
  await prefsLoaded;
}

async function ensureContext() {
  await Promise.all([ensureLiveIds(), ensureDemoFlag()]);
}

function fallbackSource() {
  return demoEnabled ? demoMonitoringSource : emptyMonitoringSource;
}

export function invalidateMonitoringSource() {
  loaded = null;
  prefsLoaded = null;
}

export async function monitoringDemoEnabled() {
  await ensureDemoFlag();
  return demoEnabled;
}

async function liveDay(equipmentId, date) {
  const response = await monitoringAPI.getDay(equipmentId, date);
  return response.data;
}

export const monitoringSource = {
  async getDay(equipmentId, date, now = new Date()) {
    await ensureContext();
    if (!liveIds.has(equipmentId)) return fallbackSource().getDay(equipmentId, date, now);
    return liveDay(equipmentId, date);
  },
  async getRange(equipmentIds, from, to, now = new Date()) {
    await ensureContext();
    const live = equipmentIds.filter((id) => liveIds.has(id));
    const offline = equipmentIds.filter((id) => !liveIds.has(id));
    const [liveRows, offlineRows] = await Promise.all([
      live.length ? monitoringAPI.getRange(live, from, to).then((response) => response.data) : [],
      offline.length ? fallbackSource().getRange(offline, from, to, now) : [],
    ]);
    const byId = new Map([...liveRows, ...offlineRows].map((row) => [row.equipmentId, row]));
    return equipmentIds.map((equipmentId) => byId.get(equipmentId));
  },
  async getSnapshot(equipmentId, now = new Date()) {
    await ensureContext();
    if (!liveIds.has(equipmentId)) return fallbackSource().getSnapshot(equipmentId, now);
    const response = await monitoringAPI.getSnapshot(equipmentId);
    return response.data;
  },
};
