const API = '/api/simulator-public';
const labels = { off: 'Выключено', idle: 'Простаивает', working: 'Работает', fault: 'Авария' };
const stateElement = document.getElementById('state');
const stateLabel = document.getElementById('state-label');
const registerValue = document.getElementById('register-value');
const remainingElement = document.getElementById('remaining');
const durationInput = document.getElementById('duration');
const messageElement = document.getElementById('message');
const buttons = [...document.querySelectorAll('[data-action]')];
let snapshot = null;
let busy = false;
let connected = false;

function showMessage(message, error = false) {
  messageElement.textContent = message;
  messageElement.classList.toggle('error', error);
}

function render() {
  const state = snapshot?.state;
  stateElement.dataset.state = state || 'unknown';
  stateLabel.textContent = labels[state] || 'Нет связи';
  registerValue.textContent = snapshot?.value ?? '—';
  remainingElement.textContent = snapshot?.workEndsAt
    ? `${Math.max(0, Math.ceil((new Date(snapshot.workEndsAt).getTime() - Date.now()) / 1000))} сек`
    : '—';
  for (const button of buttons) {
    const action = button.dataset.action;
    button.disabled = busy || !connected || !state || (action === 'power_on' && state !== 'off')
      || (action === 'start_work' && state !== 'idle')
      || (action === 'power_off' && state === 'off')
      || (action === 'fault' && (state === 'off' || state === 'fault'))
      || (action === 'restore' && state !== 'fault');
  }
}

async function request(options, path = '') {
  const response = await fetch(`${API}${path}`, { cache: 'no-store', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Эмулятор недоступен');
  return data;
}

async function refresh() {
  try {
    snapshot = await request();
    render();
  } catch (error) {
    snapshot = null;
    render();
    showMessage(error.message, true);
  }
}

async function connect() {
  try {
    await request({ method: 'POST' }, '/connect');
    connected = true;
    showMessage('FC7 подключён к тестовому сигналу. Статус в основном приложении обновляется раз в 15 секунд.');
  } catch (error) {
    connected = false;
    showMessage(error.message, true);
  }
  render();
}

async function command(action) {
  const durationSec = Number(durationInput.value);
  if (action === 'start_work' && (!Number.isInteger(durationSec) || durationSec < 1 || durationSec > 86400)) {
    showMessage('Укажите целое время работы от 1 до 86400 секунд', true);
    return;
  }
  busy = true;
  render();
  try {
    snapshot = await request({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, durationSec }) });
    showMessage('Сигнал изменён. Статус станка обновится после очередного опроса.');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    busy = false;
    render();
  }
}

for (const button of buttons) button.addEventListener('click', () => command(button.dataset.action));
render();
connect().then(refresh);
setInterval(refresh, 2000);
setInterval(render, 1000);
