/**
 * Путь к странице выполнения работы через QR-сканер.
 */
export function getTaskScanPath(task) {
  const code = task.qrCode || task.inventoryNumber || task.equipmentId;
  return `/scan/${encodeURIComponent(code)}?work=${task.workId}`;
}
