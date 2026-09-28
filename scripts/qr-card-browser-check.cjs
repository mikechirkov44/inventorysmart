const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const QRCode = require('qrcode');

(async () => {
  const source = fs.readFileSync('client/src/pages/EquipmentDetail.jsx', 'utf8');
  const handler = source.split('const handleDownloadQRJpg = () => {')[1].split('\n  };')[0];
  const qrImage = await QRCode.toDataURL('http://217.114.4.80/scan/test', { width: 300, margin: 2 });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const result = await page.evaluate(async ({ handler, qrImage }) => {
      const canvases = [];
      const create = document.createElement.bind(document);
      document.createElement = (...args) => {
        const element = create(...args);
        if (args[0] === 'canvas') canvases.push(element);
        if (args[0] === 'a') element.click = () => {};
        return element;
      };
      let done;
      const completed = new Promise(resolve => { done = resolve; });
      URL.createObjectURL = blob => { done(blob); return 'blob:test'; };
      URL.revokeObjectURL = () => {};
      new Function('qrData', 'equipment', 'toast', handler)(
        { qrImage }, { name: 'Муфельная печь Ognedar MF-05', inventoryNumber: 'ИТ-00149' },
        { error: (...args) => { throw new Error(args.join(' ')); } },
      );
      const blob = await completed;
      const canvas = canvases.at(-1);
      const ctx = canvas.getContext('2d');
      const pixel = (x, y) => [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3);
      // Single-line captions: centered block height 2244 + 47 + 135 + 24 + 125 = 2575.
      const top = (3508 - 2575) / 2;
      return { width: canvas.width, height: canvas.height, type: blob.type,
        background: pixel(0, 0), roundedCorner: pixel(118, Math.ceil(top)),
        whiteBorder: pixel(1240, Math.ceil(top + 20)),
        captionPixels: [...ctx.getImageData(118, Math.ceil(top + 2244 + 47), 2244, 135).data].filter((v, i) => i % 4 !== 3 && v > 240).length };
    }, { handler, qrImage });
    assert.equal(result.width, 2480);
    assert.equal(result.height, 3508);
    assert.equal(result.type, 'image/jpeg');
    assert.deepEqual(result.background, [0, 0, 0]);
    assert.deepEqual(result.roundedCorner, [0, 0, 0]);
    assert.deepEqual(result.whiteBorder, [255, 255, 255]);
    assert.ok(result.captionPixels > 100, 'White caption must be drawn on black');
    console.log('PASS: real browser JPG renderer, A4 ratio, black background, white rounded QR padding and caption');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
