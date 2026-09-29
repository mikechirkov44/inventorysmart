const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    const commands = [];
    let connects = 0;
    let state = 'off';
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/\/api\/simulator-public(?:\/connect)?$/, route => {
      assert.equal(route.request().headers().authorization, undefined, 'Public app must not require a login token');
      if (route.request().url().endsWith('/connect')) {
        connects += 1;
        return route.fulfill({ json: { connected: true } });
      }
      if (route.request().method() === 'POST') {
        const payload = route.request().postDataJSON();
        commands.push(payload);
        state = { power_on: 'idle', start_work: 'working', power_off: 'off', fault: 'fault', restore: 'idle' }[payload.action];
      }
      return route.fulfill({ json: { state, value: { off: 0, idle: 1, working: 2, fault: 3 }[state] } });
    });
    await page.goto('http://127.0.0.1:5182/simulator/index.html');
    await page.getByRole('heading', { name: 'Эмулятор Kutez FC7' }).waitFor();
    await page.getByRole('button', { name: 'Включить' }).waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('[data-action="power_on"]').disabled);
    await page.getByRole('button', { name: 'Включить' }).click();
    await page.getByLabel('Время работы, секунд').fill('45');
    await page.getByRole('button', { name: 'Начать работу' }).click();
    await page.getByText('Работает', { exact: true }).waitFor();
    assert.deepEqual(commands.slice(0, 2), [{ action: 'power_on', durationSec: 60 }, { action: 'start_work', durationSec: 45 }]);
    await page.getByRole('button', { name: 'Авария' }).click();
    await page.getByRole('button', { name: 'Восстановить' }).click();
    await page.getByRole('button', { name: 'Выключить' }).click();
    assert.deepEqual(commands.slice(2).map(item => item.action), ['fault', 'restore', 'power_off']);
    assert.equal(connects, 1);
    assert.deepEqual(errors, []);
    console.log('PASS: standalone simulator works without auth and sends all five commands');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
