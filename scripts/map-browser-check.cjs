const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('token', 'test'); localStorage.setItem('equipment-view', 'map');
      // Reproduce HTTP deployment where randomUUID is unavailable.
      Object.defineProperty(crypto, 'randomUUID', { value: undefined });
    });
    let layout = { id: 'floor', name: 'Этаж', canvasWidth: 1600, canvasHeight: 900, version: 0, elements: [], placements: [{ equipmentId: 'eq', x: 800, y: 400, width: 180, height: 80, equipment: { id: 'eq', name: 'Станок', status: 'working' } }] };
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let data = {};
      if (path === '/api/auth/me') data = { id: 'tester', role: 'admin', permissions: { equipment: 'full' } };
      else if (path.includes('license')) data = { status: 'active' };
      else if (path.endsWith('/buildings')) data = [{ id: 'building', name: 'Здание', floors: [{ id: 'floor', name: 'Этаж' }] }];
      else if (path.endsWith('/layout')) { layout = { ...layout, ...route.request().postDataJSON(), version: layout.version + 1 }; data = { version: layout.version }; }
      else if (path.endsWith('/floors/floor')) data = layout;
      else if (path.endsWith('/unplaced-equipment')) data = [];
      await route.fulfill({ json: data });
    });
    await page.goto('http://127.0.0.1:5173/equipment');
    await page.getByRole('button', { name: 'Редактировать', exact: true }).click();
    await page.getByRole('button', { name: 'Стена', exact: true }).click();
    const box = await page.locator('.map-canvas').boundingBox();
    const draw = async (x,y,dx,dy) => { await page.mouse.move(box.x+x,box.y+y); await page.mouse.down(); await page.mouse.move(box.x+x+dx,box.y+y+dy,{steps:8}); await page.mouse.up(); };
    await draw(80,100,180,0);
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.map-wall').count(), 1, `Wall not created: ${errors.join('; ')}`);
    await page.getByRole('button', { name: 'Прямоугольник', exact: true }).click();
    await draw(90,200,200,130);
    assert.equal(await page.locator('.map-wall').count(), 5);
    await page.getByRole('button', { name: 'Метка', exact: true }).click();
    await page.mouse.click(box.x+350,box.y+150);
    const dialog = page.getByRole('dialog', { name: 'Новая метка' });
    assert.equal(await dialog.getByRole('button', { name: 'Добавить' }).isDisabled(), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.map-label').count(), 0);
    await page.mouse.click(box.x+350,box.y+150);
    await dialog.getByLabel('Название метки').fill('Цех литья');
    await dialog.getByRole('button', { name: 'Добавить' }).click();
    assert.equal(await page.locator('.map-label').textContent(), 'Цех литья');
    await page.locator('.map-equipment-card').click();
    const handle = await page.locator('.map-resize-handle').boundingBox();
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2 + 60, handle.y + handle.height / 2 + 40, { steps: 8 });
    await page.mouse.up();
    assert.ok(Number(await page.locator('.map-equipment-card').getAttribute('width')) > 180, 'Equipment should resize even after label tool was used');
    await page.waitForTimeout(1300);
    assert.equal(layout.elements.length, 6);
    await page.reload();
    await page.locator('.map-wall').first().waitFor({ state: 'attached' });
    assert.equal(await page.locator('.map-wall').count(), 5);
    assert.equal(await page.locator('.map-label').textContent(), 'Цех литья');
    assert.ok(Number(await page.locator('.map-equipment-card').getAttribute('width')) > 180);
    assert.deepEqual(errors, []);
    console.log('PASS: HTTP UUID compatibility, mouse wall/rectangle drawing, label dialog and cancellation, equipment resizing, save and reload');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
