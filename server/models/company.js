/**
 * @module CompanyModel
 * @description Модель для управления настройками компании (company_settings).
 * Хранит информацию о названии компании, логотипе, часовой зоне,
 * лицензионном ключе и флаге разрешения инспекций без QR-кода.
 */

const { query } = require('../db');
const { verifyLicense } = require('../utils/license');

/** Количество рабочих дней в демо-режиме */
const DEMO_WORKING_DAYS = 5;

/**
 * Преобразует строку из БД в объект компании.
 * @param {Object|null} row - Строка из таблицы company_settings
 * @returns {Object|null} Объект компании или null
 */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    logo: row.logo,
    timezone: row.timezone,
    allowInspectionWithoutQr: row.allow_inspection_without_qr,
    licenseKey: row.license_key || '',
    apiEnabled: row.api_enabled,
    apiKey: row.api_key || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Подсчитывает количество рабочих дней между двумя датами.
 * Рабочие дни — Пн-Пт.
 * @param {Date} from - Начальная дата
 * @param {Date} to - Конечная дата
 * @returns {number} Количество рабочих дней
 */
function countWorkingDays(from, to) {
  let count = 0;
  const current = new Date(from);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(to);
  endDate.setHours(0, 0, 0, 0);
  while (current <= endDate) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Получает дату окончания демо-режима (created_at + 5 рабочих дней).
 * @param {Date} createdAt - Дата создания компании
 * @returns {Date} Дата окончания демо
 */
function getDemoEndDate(createdAt) {
  let count = 0;
  const current = new Date(createdAt);
  current.setHours(0, 0, 0, 0);
  while (count < DEMO_WORKING_DAYS) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return current;
}

/**
 * Проверяет статус лицензии компании.
 * @param {Object} company - Объект компании
 * @returns {Object} Статус лицензии
 */
function checkLicense(company) {
  if (company.licenseKey) {
    const decoded = verifyLicense(company.licenseKey);
    if (decoded) {
      if (company.companyId && decoded.companyId !== company.companyId) {
        return { status: 'invalid', message: 'Лицензионный ключ не соответствует компании' };
      }
      const expiresAt = new Date(decoded.expiresAt);
      if (!isNaN(expiresAt.getTime()) && expiresAt > new Date()) {
        return {
          status: 'active',
          plan: decoded.plan,
          expiresAt: decoded.expiresAt,
          message: `Полная лицензия — ${decoded.plan} до ${expiresAt.toLocaleDateString('ru-RU')}`,
        };
      }
      return { status: 'expired', message: 'Срок действия лицензии истёк' };
    }
    return { status: 'invalid', message: 'Неверный лицензионный ключ' };
  }

  if (!company.createdAt) {
    return { status: 'demo', daysLeft: DEMO_WORKING_DAYS, message: 'Демо-режим' };
  }

  const createdAt = new Date(company.createdAt);
  const usedDays = countWorkingDays(createdAt, new Date());
  const daysLeft = Math.max(0, DEMO_WORKING_DAYS - usedDays + 1);
  const demoEnd = getDemoEndDate(createdAt);

  if (daysLeft <= 0) {
    return {
      status: 'blocked',
      message: `Демо-режим истёк ${demoEnd.toLocaleDateString('ru-RU')}. Введите лицензионный ключ.`
    };
  }

  return {
    status: 'demo',
    daysLeft,
    demoEnd: demoEnd.toISOString().split('T')[0],
    message: `Демо-режим — ${daysLeft} раб. дн.`
  };
}

module.exports = {
  /**
   * Получает все компании.
   * @async
   * @returns {Promise<Array<Object>>} Список компаний
   */
  findAll: async () => {
    const { rows } = await query('SELECT * FROM company_settings ORDER BY created_at DESC');
    return rows.map(mapRow);
  },

  /**
   * Получает настройки компании по company_id. Если записей нет — создаёт дефолтную.
   * @async
   * @param {string} [companyId] - Идентификатор компании
   * @returns {Promise<Object>} Настройки компании
   */
  get: async (companyId) => {
    if (companyId) {
      const { rows } = await query('SELECT * FROM company_settings WHERE company_id = $1 LIMIT 1', [companyId]);
      if (rows.length > 0) return mapRow(rows[0]);
    }
    const { rows } = await query('SELECT * FROM company_settings LIMIT 1');
    if (rows.length === 0) {
      const { rows: inserted } = await query(
        'INSERT INTO company_settings DEFAULT VALUES RETURNING *'
      );
      return mapRow(inserted[0]);
    }
    return mapRow(rows[0]);
  },

  /**
   * Обновляет настройки компании.
   * @async
   * @param {Object} data - Данные для обновления
   * @param {string} [data.companyName] - Название компании
   * @param {string} [data.logo] - Логотип (URL или base64)
   * @param {string} [data.timezone] - Часовая зона
   * @param {boolean} [data.allowInspectionWithoutQr] - Разрешить инспекции без QR
   * @param {string} [data.licenseKey] - Лицензионный ключ
   * @param {boolean} [data.apiEnabled] - Включить API доступ
   * @param {string} [data.apiKey] - API ключ для внешних сервисов
   * @returns {Promise<Object>} Обновлённые настройки компании
   */
  update: async (data) => {
    const existing = await module.exports.get(data.companyId);
    const mapped = {};
    if (data.companyName !== undefined) mapped.company_name = data.companyName;
    if (data.logo !== undefined) mapped.logo = data.logo;
    if (data.timezone !== undefined) mapped.timezone = data.timezone;
    if (data.allowInspectionWithoutQr !== undefined) mapped.allow_inspection_without_qr = data.allowInspectionWithoutQr;
    if (data.licenseKey !== undefined) mapped.license_key = data.licenseKey;
    if (data.apiEnabled !== undefined) mapped.api_enabled = data.apiEnabled;
    if (data.apiKey !== undefined) mapped.api_key = data.apiKey;
    mapped.updated_at = new Date();

    const keys = Object.keys(mapped);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const vals = keys.map(k => mapped[k]);
    vals.push(existing.id);

    const { rows } = await query(
      `UPDATE company_settings SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    return mapRow(rows[0]);
  },

  /**
   * Получает статус лицензии компании.
   * @async
   * @param {string} companyId - Идентификатор компании
   * @returns {Promise<Object>} Статус лицензии
   */
  getLicenseStatus: async (companyId) => {
    const company = await module.exports.get(companyId);
    if (!company) {
      return { status: 'blocked', message: 'Компания не найдена' };
    }
    return checkLicense(company);
  },

  /** Количество рабочих дней в демо-режиме */
  DEMO_WORKING_DAYS,

  /** Функция подсчёта рабочих дней */
  countWorkingDays,

  /** Функция проверки лицензии */
  checkLicense
};
