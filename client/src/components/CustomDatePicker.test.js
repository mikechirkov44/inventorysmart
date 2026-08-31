import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('custom date picker exposes the field label to assistive technology', async () => {
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });

  try {
    const { default: CustomDatePicker } = await vite.ssrLoadModule('/src/components/CustomDatePicker.jsx');
    const html = renderToStaticMarkup(
      React.createElement(CustomDatePicker, {
        value: '',
        onChange: () => {},
        ariaLabel: 'Дата ввода в эксплуатацию',
      }),
    );

    assert.match(html, /aria-label="Дата ввода в эксплуатацию"/);
  } finally {
    await vite.close();
  }
});
