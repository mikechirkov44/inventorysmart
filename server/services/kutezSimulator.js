const KUTEZ_FC7_ID = '972a9d41-dcfa-4835-a23f-7c1efaa01e3d';
const STATE_REGISTER = { off: 0, idle: 1, working: 2, fault: 3 };

function isKutezDemoLink(link, enabled = process.env.MONITORING_SIMULATOR === 'true') {
  return Boolean(enabled && link?.enabled && (link.protocol || 'modbus') === 'modbus'
    && ['127.0.0.1', 'localhost'].includes(link.host)
    && Number(link.port) === Number(process.env.MONITORING_SIMULATOR_PORT || 1502)
    && Number(link.unitId) === 1 && Number(link.registerAddress) === 1);
}

function createKutezSimulator(now = Date.now) {
  let state = 'off';
  let workEndsAt = null;

  const snapshot = () => {
    if (state === 'working' && now() >= workEndsAt) {
      state = 'idle';
      workEndsAt = null;
    }
    return { state, value: STATE_REGISTER[state], workEndsAt: workEndsAt ? new Date(workEndsAt).toISOString() : null };
  };

  const command = (action, durationSec) => {
    snapshot();
    if (action === 'power_on') {
      if (state === 'off') state = 'idle';
    } else if (action === 'power_off') {
      state = 'off';
      workEndsAt = null;
    } else if (action === 'start_work') {
      if (state !== 'idle') throw new Error('Для начала работы станок должен быть включён и исправен');
      if (!Number.isInteger(durationSec) || durationSec < 1 || durationSec > 86400) throw new Error('Длительность работы: от 1 до 86400 секунд');
      state = 'working';
      workEndsAt = now() + durationSec * 1000;
    } else if (action === 'fault') {
      if (state === 'off') throw new Error('Выключенный станок не может перейти в аварию');
      state = 'fault';
      workEndsAt = null;
    } else if (action === 'restore') {
      if (state !== 'fault') throw new Error('Восстановление доступно только после аварии');
      state = 'idle';
    } else {
      throw new Error('Неизвестная команда эмулятора');
    }
    return snapshot();
  };

  return { snapshot, command };
}

const kutezSimulator = createKutezSimulator();
module.exports = { KUTEZ_FC7_ID, createKutezSimulator, kutezSimulator, isKutezDemoLink };
