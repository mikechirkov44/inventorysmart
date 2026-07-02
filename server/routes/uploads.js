const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../models/user');
const { verifyUploadSignature, normalizeUploadFilename } = require('../utils/uploadAccess');
const { UPLOADS_DIR } = require('../utils/upload');

const router = express.Router();

function isAuthorized(req, filename) {
  const { exp, sig, cid } = req.query;
  if (exp && sig && cid && verifyUploadSignature(filename, cid, exp, sig)) {
    return true;
  }

  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return false;
  }

  try {
    jwt.verify(header.split(' ')[1], JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

router.get('/:filename', (req, res) => {
  const filename = normalizeUploadFilename(req.params.filename);
  if (!filename || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  if (!isAuthorized(req, filename)) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  return res.sendFile(filePath);
});

module.exports = router;
