const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    const commands = [];
    let connected = false;
    let state = 'off';
    let polledState = 'off';
    await page.addInitScript(() => localStorage.setItem('token', 'local-test'));
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      let data = [];
      if (url.pathname === '/api/auth/me') data = { id: 'admin', role: 'admin', permissions: { equipment: 'full' } };
      else if (url.pathname === '/api/company/license-status') data = { status: 'active' };
      else if (url.pathname === '/api/company') data = { companyName: 'Проверка' };
      else if (url.pathname === '/api/monitoring/simulator/kutez-fc7') data = { equipmentId: '972a9d41-dcfa-4835-a23f-7c1efaa01e3d', connected, state, polledState };
      else if (url.pathname === '/api/monitoring/simulator/kutez-fc7/connect') { connected = true; data = { connected, state, polledState }; }
      else if (url.pathname === '/api/monitoring/simulator/kutez-fc7/command') {
        const payload = route.request().postDataJSON();
        commands.push(payload);
        state = { power_on: 'idle', start_work: 'working', power_off: 'off', fault: 'fault', restore: 'idle' }[payload.action];
        data = { state, polledState };
      }
      return route.fulfill({ json: data });
    });
    await page.goto('http://127.0.0.1:5182/monitoring/kutez-fc7-simulator');
    await page.getByRole('button', { name: 'Включить' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Подключить эмулятор FC7' }).count(), 0);
    await page.getByRole('button', { name: 'Включить' }).click();
    await page.getByLabel('Время работы, секунд').fill('45');
    await page.getByRole('button', { name: 'Начать работу' }).click();
    await page.locator('.kutez-simulator-status > div').nth(0).getByText('Работа').waitFor();
    await page.locator('.kutez-simulator-status > div').nth(1).getByText('Выключено').waitFor();
    polledState = 'working';
    await page.locator('.kutez-simulator-status > div').nth(1).getByText('Работа').waitFor();
    assert.deepEqual(commands.slice(0, 2), [{ action: 'power_on', durationSec: 60 }, { action: 'start_work', durationSec: 45 }]);
    await page.getByRole('button', { name: 'Авария' }).click();
    await page.getByRole('button', { name: 'Восстановить' }).click();
    await page.getByRole('button', { name: 'Выключить' }).click();
    assert.deepEqual(commands.slice(2).map(item => item.action), ['fault', 'restore', 'power_off']);
    assert.deepEqual(errors, []);
    console.log('PASS: Kutez simulator page connects and sends all five commands');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
