/**
 * @module Маршруты компании
 * @description API для управления данными компании: получение информации,
 * обновление настроек (название, часовой пояс, логотип), активация лицензии.
 */

const express = require('express');
const router = express.Router();
const Company = require('../models/company');
const { authenticate, requirePermission } = require('../middleware/auth');
const { verifyLicense } = require('../utils/license');
const { imageUpload } = require('../utils/upload');

function maskApiKey(apiKey) {
  if (!apiKey) return '';
  if (apiKey.length <= 8) return '********';
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

function sanitizeCompany(company, includeApiKey = false) {
  if (!company) return company;
  const copy = { ...company };
  if (!includeApiKey && copy.apiKey) {
    copy.apiKey = maskApiKey(copy.apiKey);
  }
  return copy;
}

/**
 * @route GET /company
 * @description Получение данных текущей компании
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const company = await Company.get(req.user.companyId);
    const license = await Company.getLicenseStatus(req.user.companyId);
    const includeApiKey = req.user.permissions?.settings === 'full';
    res.json({ ...sanitizeCompany(company, includeApiKey), license });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /company/license-status
 * @description Получение статуса лицензии компании
 */
router.get('/license-status', authenticate, async (req, res) => {
  try {
    const license = await Company.getLicenseStatus(req.user.companyId);
    res.json(license);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route PUT /company
 * @description Обновление данных компании (название, часовой пояс, логотип, настройки)
 * @requires authenticate
 * @requires permission settings:edit
 * @param {string} [req.body.companyName] - Название компании
 * @param {string} [req.body.timezone] - Часовой пояс
 * @param {boolean} [req.body.allowInspectionWithoutQr] - Разрешить осмотр без QR
 * @param {File} [req.file] - Файл логотипа (multipart/form-data)
 * @returns {Object} Обновлённые данные компании
 */
router.put('/', authenticate, requirePermission('settings', 'edit'), imageUpload.single('logo'), async (req, res) => {
  try {
    const data = { companyId: req.user.companyId };
    if (req.body.companyName !== undefined) data.companyName = req.body.companyName;
    if (req.body.timezone !== undefined) data.timezone = req.body.timezone;
    if (req.body.allowInspectionWithoutQr !== undefined) {
      data.allowInspectionWithoutQr = req.body.allowInspectionWithoutQr === 'true' || req.body.allowInspectionWithoutQr === true;
    }
    if (req.file) {
      data.logo = req.file.filename;
    }

    const company = await Company.update(data);
    res.json(company);
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route POST /company/activate-license
 * @description Активация лицензионного ключа для компании
 * @requires authenticate
 * @requires permission settings:edit
 * @param {Object} req.body
 * @param {string} req.body.key - Лицензионный ключ (Base64-encoded JSON)
 * @returns {Object} Информация о плане и дате окончания лицензии
 */
router.post('/activate-license', authenticate, requirePermission('settings', 'edit'), async (req, res) => {
  try {
    const { key } = req.body;
    if (!key || !key.trim()) {
      return res.status(400).json({ error: 'Введите лицензионный ключ' });
    }

    const decoded = verifyLicense(key);
    if (!decoded) {
      return res.status(400).json({ error: 'Неверный формат лицензионного ключа' });
    }

    if (decoded.companyId !== req.user.companyId) {
      return res.status(400).json({ error: 'Лицензионный ключ не соответствует вашей компании' });
    }

    const expiresDate = new Date(decoded.expiresAt);
    if (isNaN(expiresDate.getTime())) {
      return res.status(400).json({ error: 'Неверная дата окончания лицензии' });
    }

    if (expiresDate < new Date()) {
      return res.status(400).json({ error: 'Срок действия лицензии истёк' });
    }

    await Company.update({ companyId: req.user.companyId, licenseKey: key.trim() });

    res.json({
      plan: decoded.plan,
      expiresAt: decoded.expiresAt,
    });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
