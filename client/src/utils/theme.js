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

function lightenHex(hex, amount = 0.35) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const f = amount;
  const r = Math.round(rgb.r + (255 - rgb.r) * f);
  const g = Math.round(rgb.g + (255 - rgb.g) * f);
  const b = Math.round(rgb.b + (255 - rgb.b) * f);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Применяет цвет бренда к CSS-переменным.
 */
export function applyThemeColor(color) {
  const primary = /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_PRIMARY;
  const root = document.documentElement;
  const rgb = hexToRgb(primary) || { r: 79, g: 70, b: 229 };
  const hover = darkenHex(primary);
  const accent = lightenHex(primary, 0.25);
  const soft = lightenHex(primary, 0.55);
  const softer = lightenHex(primary, 0.7);

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-hover', hover);
  root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  root.style.setProperty('--primary-light', `${primary}1a`);
  root.style.setProperty('--primary-glow', `${primary}26`);
  root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${primary}, ${accent})`);
  root.style.setProperty('--gradient-primary-hover', `linear-gradient(135deg, ${hover}, ${darkenHex(accent)})`);

  // Сайдбар: выделение активного пункта и акценты
  root.style.setProperty('--nav-active-bg', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22)`);
  root.style.setProperty('--nav-active-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`);
  root.style.setProperty('--nav-accent', soft);
  root.style.setProperty('--nav-accent-soft', softer);
}

export function resetThemeColor() {
  applyThemeColor(DEFAULT_PRIMARY);
}
