import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('printed QR keeps A4 geometry and emits enlarged equipment captions', () => {
  const source = readFileSync(new URL('./EquipmentDetail.jsx', import.meta.url), 'utf8');
  const handler = source.split('const handlePrintQR = () => {')[1].split('\n  };')[0];
  let html = '';
  new Function('window', 'qrData', 'equipment', handler)(
    { open: () => ({ document: { write: value => { html = value; }, close() {} } }) },
    { qrImage: 'data:image/png;base64,test' }, { name: 'Насос', inventoryNumber: 'ИТ-1' },
  );
  assert.match(html, /@page\s*\{\s*size:\s*A4;\s*margin:\s*10mm/);
  assert.match(html, /width:\s*190mm;\s*height:\s*190mm/);
  assert.match(html, /\.qr-card h2\s*\{[^}]*font-size:\s*26pt/);
  assert.match(html, /\.qr-card p\s*\{[^}]*font-size:\s*23pt/);
  assert.match(html, /Инв\. номер: ИТ-1/);
});
