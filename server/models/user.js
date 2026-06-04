/**
 * @module UserModel
 * @description Модель для управления пользователями системы (users).
 * Хранит учётные данные, роли, привязку к должности и сотруднику.
 * Предоставляет функции аутентификации, CRUD-операций и проверки паролей.
 */

const { query } = require('../db');
const bcrypt = require('bcryptjs');

/** @constant {string} JWT_SECRET Секретный ключ для JWT-токенов */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}
/** @constant {string} JWT_EXPIRES Срок действия JWT-токена */
const JWT_EXPIRES = '24h';

/**
 * Преобразует строку из БД в объект пользователя.
 * @param {Object|null} row - Строка из таблицы users
 * @returns {Object|null} Объект пользователя или null
 */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    role: row.role || 'user',
    positionId: row.position_id,
    employeeId: row.employee_id,
    companyId: row.company_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  /** @type {string} Секретный ключ для JWT */
  JWT_SECRET,
  /** @type {string} Срок действия JWT */
  JWT_EXPIRES,

  /**
   * Проверяет, требуется ли начальная настройка (нет пользователей в системе).
   * @async
   * @returns {Promise<boolean>} true если нет ни одного пользователя
   */
  isSetupRequired: async () => {
    const { rows } = await query('SELECT COUNT(*) FROM users');
    return parseInt(rows[0].count) === 0;
  },

  /**
   * Получает всех пользователей компании (кроме суперадминов) с должностями.
   * @async
   * @param {string} companyId - Идентификатор компании
   * @returns {Promise<Array<Object>>} Список пользователей компании
   */
  findAllByCompany: async (companyId) => {
    const { rows } = await query(`
      SELECT u.id, u.username, u.full_name, u.position_id, u.employee_id, u.created_at, u.updated_at,
             p.name as position_name, p.permissions as position_permissions,
             e.first_name, e.last_name
      FROM users u
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE u.company_id = $1 AND u.role != 'superadmin'
      ORDER BY u.created_at
    `, [companyId]);
    return rows.map(r => ({
      ...mapRow(r),
      positionName: r.position_name || null,
      positionPermissions: r.position_permissions ? (typeof r.position_permissions === 'string' ? JSON.parse(r.position_permissions) : r.position_permissions) : null,
      employeeName: r.first_name && r.last_name ? `${r.last_name} ${r.first_name}` : null
    }));
  },

  /**
   * Получает всех пользователей с должностями и именами сотрудников.
   * @async
   * @returns {Promise<Array<Object>>} Список пользователей
   */
  findAll: async () => {
    const { rows } = await query(`
      SELECT u.id, u.username, u.full_name, u.position_id, u.employee_id, u.created_at, u.updated_at,
             p.name as position_name, p.permissions as position_permissions,
             e.first_name, e.last_name
      FROM users u
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN employees e ON u.employee_id = e.id
      ORDER BY u.created_at
    `);
    return rows.map(r => ({
      ...mapRow(r),
      positionName: r.position_name || null,
      positionPermissions: r.position_permissions ? (typeof r.position_permissions === 'string' ? JSON.parse(r.position_permissions) : r.position_permissions) : null,
      employeeName: r.first_name && r.last_name ? `${r.last_name} ${r.first_name}` : null
    }));
  },

  /**
   * Находит пользователя по ID с должностью и разрешениями.
   * @async
   * @param {number} id - Идентификатор пользователя
   * @returns {Promise<Object|null>} Объект пользователя или null
   */
  findById: async (id) => {
    const { rows } = await query(`
      SELECT u.id, u.username, u.full_name, u.position_id, u.employee_id, u.created_at, u.updated_at,
             p.name as position_name, p.permissions as position_permissions
      FROM users u
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.id = $1
    `, [id]);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      ...mapRow(r),
      positionName: r.position_name || null,
      positionPermissions: r.position_permissions ? (typeof r.position_permissions === 'string' ? JSON.parse(r.position_permissions) : r.position_permissions) : null
    };
  },

  /**
   * Находит пользователя по имени пользователя с должностью и разрешениями.
   * @async
   * @param {string} username - Имя пользователя
   * @returns {Promise<Object|null>} Объект пользователя (сырой из БД) или null
   */
  findByUsername: async (username) => {
    const { rows } = await query(`
      SELECT u.*, p.name as position_name, p.permissions as position_permissions
      FROM users u
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.username = $1
    `, [username]);
    return rows[0] || null;
  },

  /**
   * Создаёт нового пользователя. Если имя занято — возвращает null.
   * @async
   * @param {Object} data - Данные пользователя
   * @param {string} data.username - Имя пользователя (уникальное)
   * @param {string} data.password - Пароль (хэшируется)
   * @param {string} [data.fullName] - Полное имя
   * @param {number} [data.positionId] - ID должности
   * @param {number} [data.employeeId] - ID связанного сотрудника
   * @returns {Promise<Object|null>} Созданный пользователь или null
   */
  create: async (data) => {
    const existing = await module.exports.findByUsername(data.username);
    if (existing) return null;

    const hash = bcrypt.hashSync(data.password, 10);
    const { rows } = await query(
      'INSERT INTO users (username, password_hash, full_name, position_id, employee_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, position_id, employee_id, created_at, updated_at',
      [data.username, hash, data.fullName || '', data.positionId || null, data.employeeId || null]
    );
    return mapRow(rows[0]);
  },

  /**
   * Обновляет данные пользователя по ID.
   * @async
   * @param {number} id - Идентификатор пользователя
   * @param {Object} data - Данные для обновления
   * @param {string} [data.password] - Новый пароль (хэшируется)
   * @param {string} [data.fullName] - Полное имя
   * @param {number} [data.positionId] - ID должности
   * @param {number} [data.employeeId] - ID сотрудника
   * @returns {Promise<Object|null>} Обновлённый пользователь или null
   */
  update: async (id, data) => {
    const mapped = {};
    if (data.password) {
      mapped.password_hash = bcrypt.hashSync(data.password, 10);
    }
    if (data.fullName !== undefined) mapped.full_name = data.fullName;
    if (data.positionId !== undefined) mapped.position_id = data.positionId;
    if (data.employeeId !== undefined) mapped.employee_id = data.employeeId;
    mapped.updated_at = new Date();

    const keys = Object.keys(mapped);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    const vals = keys.map(k => mapped[k]);
    vals.push(id);
    const { rows } = await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id, username, full_name, position_id, employee_id, created_at, updated_at`, vals);
    return mapRow(rows[0]);
  },

  /**
   * Удаляет пользователя по ID.
   * @async
   * @param {number} id - Идентификатор пользователя
   * @returns {Promise<boolean>} true если удалён, иначе false
   */
  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM users WHERE id = $1', [id]);
    return rowCount > 0;
  },

  /**
   * Проверяет пароль пользователя.
   * @param {string} plain - Открытый пароль
   * @param {string} hash - Хэш пароля из БД
   * @returns {boolean} true если пароль совпадает
   */
  verifyPassword: (plain, hash) => bcrypt.compareSync(plain, hash)
};
