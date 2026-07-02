const crypto = require('crypto');
const { JWT_SECRET } = require('../models/user');

const LICENSE_SECRET = process.env.LICENSE_SECRET || JWT_SECRET;

function signLicense(payload) {
  const data = {
    plan: payload.plan,
    expiresAt: payload.expiresAt,
    companyId: payload.companyId,
  };
  const signature = crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(JSON.stringify(data))
    .digest('hex');
  return Buffer.from(JSON.stringify({ ...data, signature })).toString('base64');
}

function verifyLicense(key) {
  if (!key || !key.trim()) return null;
  try {
    const decoded = JSON.parse(Buffer.from(key.trim(), 'base64').toString('utf-8'));
    const { signature, ...data } = decoded;
    if (!signature || !data.plan || !data.expiresAt || !data.companyId) return null;
    const expected = crypto
      .createHmac('sha256', LICENSE_SECRET)
      .update(JSON.stringify(data))
      .digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

module.exports = { signLicense, verifyLicense };
