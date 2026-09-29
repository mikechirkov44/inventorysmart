const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const equipment = { id: 'machine-1', name: 'Тестовый станок', inventoryNumber: 'Т-1', status: 'working', roomId: null, categoryId: null, workIds: [] };
    let state = 'fault';
    await page.addInitScript(() => localStorage.setItem('token', 'local-test'));
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      let data = [];
      if (url.pathname === '/api/auth/me') data = { id: 'admin', role: 'admin', permissions: { equipment: 'full' } };
      else if (url.pathname === '/api/company/license-status') data = { status: 'active' };
      else if (url.pathname === '/api/company') data = { companyName: 'Проверка' };
      else if (url.pathname === '/api/equipment') data = [equipment];
      else if (url.pathname === '/api/equipment/machine-1') data = equipment;
      else if (url.pathname === '/api/monitoring/statuses') data = [{ equipmentId: equipment.id, state, source: 'modbus' }];
      else if (url.pathname === '/api/monitoring/links/machine-1') data = { enabled: true, protocol: 'modbus', host: '127.0.0.1', port: 1502, unitId: 1, registerAddress: 0, pollIntervalSec: 10 };
      else if (url.pathname === '/api/monitoring/live') data = { equipmentIds: [equipment.id] };
      else if (url.pathname.endsWith('/operating-hours')) data = { data: null };
      return route.fulfill({ json: data });
    });
    await page.goto('http://127.0.0.1:5182/equipment');
    await page.locator('.card-status-row .machine-status').getByText('Авария').waitFor();
    assert.equal(await page.locator('.card-status-row .status-badge').count(), 0, 'Do not show stale manual status beside live status');
    state = 'idle';
    await page.goto('http://127.0.0.1:5182/equipment/machine-1');
    await page.locator('.detail-info .machine-status').getByText('Простой').waitFor();
    state = 'off';
    await page.goto('http://127.0.0.1:5182/equipment/machine-1/edit');
    await page.getByText('Состояние считывается со станка при каждом опросе.').waitFor();
    await page.locator('.form-group').filter({ hasText: 'Состояние' }).getByText('Выключено').waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS: live state overrides manual state in card, detail and edit form');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
