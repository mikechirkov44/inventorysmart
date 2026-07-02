const crypto = require('crypto');
const path = require('path');
const { JWT_SECRET } = require('../models/user');

const UPLOAD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function normalizeUploadFilename(filename) {
  if (!filename || typeof filename !== 'string') return '';
  let value = filename.trim();
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
  return path.basename(decodeURIComponent(value));
}

function buildSignedUploadUrl(filename, companyId) {
  const safeName = normalizeUploadFilename(filename);
  if (!safeName || !companyId) return null;
  const exp = Date.now() + UPLOAD_TTL_MS;
  const payload = `${safeName}:${companyId}:${exp}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  return `/api/uploads/${encodeURIComponent(safeName)}?exp=${exp}&sig=${sig}&cid=${companyId}`;
}

function verifyUploadSignature(filename, companyId, exp, sig) {
  if (!filename || !companyId || !exp || !sig) return false;
  if (Date.now() > Number(exp)) return false;
  const safeName = normalizeUploadFilename(filename);
  const payload = `${safeName}:${companyId}:${exp}`;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

function withUploadUrls(data, companyId) {
  if (data == null || !companyId) return data;
  if (Array.isArray(data)) return data.map((item) => withUploadUrls(item, companyId));
  if (typeof data !== 'object') return data;

  const copy = { ...data };
  for (const field of ['photo', 'logo', 'instructionPdf']) {
    if (copy[field]) {
      copy[`${field}Url`] = buildSignedUploadUrl(copy[field], companyId);
    }
  }
  if (Array.isArray(copy.photos)) {
    copy.photoUrls = copy.photos.map((photo) => buildSignedUploadUrl(photo, companyId));
  }

  for (const key of Object.keys(copy)) {
    if (key.endsWith('Url') || key.endsWith('Urls')) continue;
    const value = copy[key];
    if (value && typeof value === 'object') {
      copy[key] = withUploadUrls(value, companyId);
    }
  }

  return copy;
}

module.exports = {
  UPLOAD_TTL_MS,
  normalizeUploadFilename,
  buildSignedUploadUrl,
  verifyUploadSignature,
  withUploadUrls,
};
