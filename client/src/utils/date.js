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

/** Сегодняшняя дата для input type="date" (YYYY-MM-DD). */
export function todayInputValue() {
  return toDateInputValue(new Date());
}

/** Значение для input type="date" (YYYY-MM-DD). */
export function toDateInputValue(value) {
  const date = parseDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

/** Разбор даты-времени (ISO, timestamp). */
export function parseDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const str = String(value).trim();
  if (!str) return null;

  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Форматирует дату и время для UI. */
export function formatDateTime(value, fallback = '—') {
  const date = parseDateTime(value);
  return date ? date.toLocaleString('ru-RU') : fallback;
}
