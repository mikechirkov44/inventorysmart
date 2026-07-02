/**
 * Безопасный разбор даты из ISO-строки, timestamp или Date.
 * YYYY-MM-DD интерпретируется как локальная дата (без сдвига UTC).
 */
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();
  if (!str) return null;

  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Форматирует дату для UI; при невалидном значении возвращает fallback. */
export function formatDate(value, fallback = '—') {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('ru-RU') : fallback;
}

/** true, если дата в прошлом или не распознана. */
export function isDateExpired(value) {
  const date = parseDate(value);
  if (!date) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}
