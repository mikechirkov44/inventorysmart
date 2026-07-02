const crypto = require('crypto');
const path = require('path');
const { JWT_SECRET } = require('../models/user');

const UPLOAD_TTL_MS = 60 * 60 * 1000;

function buildSignedUploadUrl(filename, companyId) {
  if (!filename || !companyId) return null;
  const safeName = path.basename(filename);
  const exp = Date.now() + UPLOAD_TTL_MS;
  const payload = `${safeName}:${companyId}:${exp}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  return `/api/uploads/${encodeURIComponent(safeName)}?exp=${exp}&sig=${sig}&cid=${companyId}`;
}

function verifyUploadSignature(filename, companyId, exp, sig) {
  if (!filename || !companyId || !exp || !sig) return false;
  if (Date.now() > Number(exp)) return false;
  const safeName = path.basename(filename);
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
  return copy;
}

module.exports = {
  UPLOAD_TTL_MS,
  buildSignedUploadUrl,
  verifyUploadSignature,
  withUploadUrls,
};
