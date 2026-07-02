/**
 * Normalizes stored upload paths to a bare filename.
 */
export function normalizeUploadFilename(filenameOrUrl) {
  if (!filenameOrUrl) return '';
  let value = String(filenameOrUrl).trim();
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      value = new URL(value).pathname;
    } catch {
      return '';
    }
  }
  if (value.includes('/api/uploads/')) {
    const part = value.split('/api/uploads/')[1];
    value = part ? part.split('?')[0] : value;
  }
  if (value.startsWith('/uploads/')) {
    value = value.slice('/uploads/'.length);
  }
  const segments = value.split('/').filter(Boolean);
  return decodeURIComponent(segments[segments.length - 1] || '');
}

/**
 * Builds an API upload path from a filename or legacy path.
 */
export function getUploadUrl(filenameOrUrl) {
  if (!filenameOrUrl) return '';
  if (filenameOrUrl.includes('sig=')) return filenameOrUrl;
  if (filenameOrUrl.startsWith('/api/uploads/')) return filenameOrUrl;
  const filename = normalizeUploadFilename(filenameOrUrl);
  if (!filename) return '';
  return `/api/uploads/${encodeURIComponent(filename)}`;
}

export function resolveUploadField(item, field) {
  if (!item) return '';
  const urlField = `${field}Url`;
  if (item[urlField]) return item[urlField];
  if (item[field]) return getUploadUrl(item[field]);
  return '';
}

export function isSignedUploadUrl(url) {
  return Boolean(url && url.includes('sig='));
}

export function isInlineImageUrl(url) {
  return Boolean(url && (url.startsWith('data:') || url.startsWith('blob:')));
}
