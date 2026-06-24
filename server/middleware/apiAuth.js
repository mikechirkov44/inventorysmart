/**
 * @module apiAuth
 * @description Middleware для аутентификации API запросов по API ключу.
 * Используется для открытого доступа к данным из внешних сервисов.
 */

const { query } = require('../db');

/**
 * Middleware для проверки API ключа.
 * API ключ должен быть передан в заголовке X-API-Key.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key is required. Provide it in X-API-Key header.' });
  }

  try {
    // Find company by API key and check if API is enabled
    const { rows } = await query(
      'SELECT id, company_id, company_name, api_enabled FROM company_settings WHERE api_key = $1',
      [apiKey]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key.' });
    }

    const company = rows[0];

    if (!company.api_enabled) {
      return res.status(403).json({ error: 'API access is disabled for this company.' });
    }

    // Attach company info to request
    req.apiCompany = {
      companyId: company.company_id,
      companyName: company.company_name
    };

    next();
  } catch (err) {
    console.error('API authentication error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = {
  authenticateApiKey
};
