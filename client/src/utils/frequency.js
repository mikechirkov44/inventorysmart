/** Варианты периодичности плановых работ */
export const FREQUENCY_OPTIONS = [
  { value: 1, label: 'Ежедневно' },
  { value: 7, label: '1 раз в неделю' },
  { value: 10, label: '1 раз в 10 дней' },
  { value: 14, label: '1 раз в 2 недели' },
  { value: 30, label: '1 раз в месяц' },
  { value: 60, label: '1 раз в 2 месяца' },
  { value: 90, label: '1 раз в 3 месяца' },
  { value: 180, label: '1 раз в 6 месяцев' },
  { value: 365, label: '1 раз в год' },
];

export function getFrequencyLabel(days) {
  const option = FREQUENCY_OPTIONS.find((item) => item.value === days);
  return option ? option.label : `каждые ${days} дн.`;
}

/** CSS-модификатор для цветового тега периодичности. */
export function getFrequencyBadgeClass(days) {
  const value = Number(days) || 30;
  if (value <= 1) return 'freq-daily';
  if (value <= 14) return 'freq-weekly';
  if (value <= 60) return 'freq-monthly';
  if (value <= 90) return 'freq-quarterly';
  return 'freq-long';
}
