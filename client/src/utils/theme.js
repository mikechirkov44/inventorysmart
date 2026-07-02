const DEFAULT_PRIMARY = '#4f46e5';

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function darkenHex(hex, amount = 0.12) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = 1 - amount;
  const r = Math.round(rgb.r * f);
  const g = Math.round(rgb.g * f);
  const b = Math.round(rgb.b * f);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Применяет цвет бренда к CSS-переменным.
 */
export function applyThemeColor(color) {
  const primary = /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_PRIMARY;
  const root = document.documentElement;
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-hover', darkenHex(primary));
  root.style.setProperty('--primary-light', `${primary}1a`);
  root.style.setProperty('--primary-glow', `${primary}26`);
}

export function resetThemeColor() {
  applyThemeColor(DEFAULT_PRIMARY);
}
