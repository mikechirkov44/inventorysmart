/**
 * Returns a signed upload URL or falls back to building from filename.
 * Prefer *Url fields from API responses when available.
 */
export function getUploadUrl(filenameOrUrl) {
  if (!filenameOrUrl) return '';
  if (filenameOrUrl.startsWith('/api/uploads/')) return filenameOrUrl;
  return `/api/uploads/${encodeURIComponent(filenameOrUrl)}`;
}

export function resolveUploadField(item, field) {
  if (!item) return '';
  const urlField = `${field}Url`;
  if (item[urlField]) return item[urlField];
  if (item[field]) return getUploadUrl(item[field]);
  return '';
}
