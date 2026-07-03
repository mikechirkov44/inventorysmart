/**
 * @module EquipmentModel
 * @description Модель для управления оборудованием (equipment).
 * Хранит информацию об оборудовании: QR-код, инвентарный номер,
 * категорию, статус, расположение и связанные работы.
 */

const { query } = require('../db');
const { pickAllowed } = require('../utils/allowlist');

const EQUIPMENT_UPDATE_FIELDS = [
  'name', 'inventoryNumber', 'description', 'location', 'category', 'roomId',
  'categoryId', 'manufacturer', 'serialNumber', 'yearOfManufacture',
  'commissioningDate', 'instructionPdf', 'instructionMd', 'photo', 'workIds',
];

function serializeDate(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().split('T')[0];
  }
  const str = String(value).trim();
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : str;
}

/**
 * Преобразует строку из БД в объект оборудования.
 * @param {Object|null} row - Строка из таблицы equipment
 * @returns {Object|null} Объект оборудования или null
 */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    qrCode: row.qr_code,
    name: row.name,
    inventoryNumber: row.inventory_number,
    description: row.description,
    photo: row.photo,
    roomId: row.room_id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    status: row.status,
    manufacturer: row.manufacturer,
    serialNumber: row.serial_number,
    yearOfManufacture: row.year_of_manufacture,
    commissioningDate: serializeDate(row.commissioning_date),
    instructionPdf: row.instruction_pdf,
    instructionMd: row.instruction_md,
    companyId: row.company_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  /**
   * Получает всё оборудование с привязанными ID работ и категориями.
   * @async
   * @returns {Promise<Array<Object>>} Список оборудования с полем workIds
   */
  findAll: async (companyId) => {
    const { rows: equipment } = await query(`
      SELECT e.*, ec.name as category_name 
      FROM equipment e 
      LEFT JOIN equipment_categories ec ON e.category_id = ec.id 
      WHERE e.company_id = $1 
      ORDER BY e.name
    `, [companyId]);
    const { rows: eqWorks } = await query('SELECT * FROM equipment_works');
    return equipment.map(eq => ({
      ...mapRow(eq),
      workIds: eqWorks.filter(ew => ew.equipment_id === eq.id).map(ew => ew.work_id)
    }));
  },

  /**
   * Находит оборудование по ID вместе с привязанными работами.
   * @async
   * @param {number} id - Идентификатор оборудования
   * @returns {Promise<Object|null>} Оборудование с workIds или null
   */
  findById: async (id, companyId) => {
    const { rows } = await query(`
      SELECT e.*, ec.name as category_name 
      FROM equipment e 
      LEFT JOIN equipment_categories ec ON e.category_id = ec.id 
      WHERE e.id = $1 AND e.company_id = $2
    `, [id, companyId]);
    if (!rows[0]) return null;
    const { rows: eqWorks } = await query('SELECT work_id FROM equipment_works WHERE equipment_id = $1', [id]);
    return { ...mapRow(rows[0]), workIds: eqWorks.map(ew => ew.work_id) };
  },

  /**
   * Находит оборудование по QR-коду.
   * @async
   * @param {string} qrCode - QR-код оборудования
   * @returns {Promise<Object|null>} Оборудование с workIds или null
   */
  findByQrCode: async (qrCode) => {
    const { rows } = await query(`
      SELECT e.*, ec.name as category_name 
      FROM equipment e 
      LEFT JOIN equipment_categories ec ON e.category_id = ec.id 
      WHERE e.qr_code = $1
    `, [qrCode]);
    if (!rows[0]) return null;
    const { rows: eqWorks } = await query('SELECT work_id FROM equipment_works WHERE equipment_id = $1', [rows[0].id]);
    return { ...mapRow(rows[0]), workIds: eqWorks.map(ew => ew.work_id) };
  },

  /**
   * Находит оборудование по инвентарному номеру.
   * @async
   * @param {string} inventoryNumber - Инвентарный номер
   * @returns {Promise<Object|null>} Оборудование с workIds или null
   */
  findByInventoryNumber: async (inventoryNumber) => {
    const { rows } = await query(`
      SELECT e.*, ec.name as category_name 
      FROM equipment e 
      LEFT JOIN equipment_categories ec ON e.category_id = ec.id 
      WHERE e.inventory_number = $1
    `, [inventoryNumber]);
    if (!rows[0]) return null;
    const { rows: eqWorks } = await query('SELECT work_id FROM equipment_works WHERE equipment_id = $1', [rows[0].id]);
    return { ...mapRow(rows[0]), workIds: eqWorks.map(ew => ew.work_id) };
  },

  /**
   * Создаёт новое оборудование с привязкой к работам.
   * @async
   * @param {Object} data - Данные оборудования
   * @param {string} data.name - Название
   * @param {string} [data.inventoryNumber] - Инвентарный номер
   * @param {string} [data.description] - Описание
   * @param {string} [data.photo] - Фото (URL)
   * @param {number} [data.roomId] - ID помещения
   * @param {string} [data.categoryId] - ID категории
   * @param {string} [data.status] - Статус (working/broken/etc)
   * @param {Array<number>} [data.workIds] - Массив ID связанных работ
   * @returns {Promise<Object>} Созданное оборудование с workIds
   */
  create: async (data, companyId) => {
    let workIds = data.workIds || [];
    if (typeof workIds === 'string') { try { workIds = JSON.parse(workIds); } catch (_) { workIds = []; } }

    // Convert yearOfManufacture: empty string -> null, string -> number or null
    const yearVal = data.yearOfManufacture;
    const yearOfManufacture = yearVal && String(yearVal).trim() !== '' ? parseInt(yearVal, 10) : null;

    const { rows } = await query(
      'INSERT INTO equipment (name, inventory_number, description, photo, room_id, category_id, status, manufacturer, serial_number, year_of_manufacture, commissioning_date, instruction_pdf, instruction_md, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
      [
        data.name,
        data.inventoryNumber || '',
        data.description || '',
        data.photo || null,
        data.roomId || null,
        data.categoryId || null,
        data.status || 'working',
        data.manufacturer || '',
        data.serialNumber || '',
        yearOfManufacture,
        data.commissioningDate || null,
        data.instructionPdf || null,
        data.instructionMd || null,
        companyId
      ]
    );
    const eq = rows[0];

    for (const wid of workIds) {
      await query('INSERT INTO equipment_works (equipment_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [eq.id, wid]);
    }

    return { ...mapRow(eq), workIds };
  },

  /**
   * Обновляет оборудование по ID, включая привязку к работам.
   * @async
   * @param {number} id - Идентификатор оборудования
   * @param {Object} data - Данные для обновления
   * @param {Array<number>} [data.workIds] - Новый список ID работ (полная замена)
   * @returns {Promise<Object|null>} Обновлённое оборудование или null
   */
  update: async (id, data, companyId) => {
    const safeData = pickAllowed(data, EQUIPMENT_UPDATE_FIELDS);
    const fieldMap = {
      inventoryNumber: 'inventory_number',
      roomId: 'room_id',
      categoryId: 'category_id',
      serialNumber: 'serial_number',
      yearOfManufacture: 'year_of_manufacture',
      commissioningDate: 'commissioning_date',
      instructionPdf: 'instruction_pdf',
      instructionMd: 'instruction_md',
    };
    const mapped = {};
    for (const [key, val] of Object.entries(safeData)) {
      if (key === 'workIds') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (key === 'yearOfManufacture') {
        mapped[col] = val && String(val).trim() !== '' ? parseInt(val, 10) : null;
      } else {
        mapped[col] = val;
      }
    }
    mapped.updated_at = new Date();

    if (Object.keys(mapped).length > 1) {
      const keys = Object.keys(mapped);
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const vals = keys.map((k) => mapped[k]);
      vals.push(id);
      vals.push(companyId);
      await query(`UPDATE equipment SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND company_id = $${vals.length}`, vals);
    }

    if (safeData.workIds !== undefined) {
      let ids = safeData.workIds;
      if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch (_) { ids = []; } }
      await query('DELETE FROM equipment_works WHERE equipment_id = $1', [id]);
      for (const wid of ids) {
        await query('INSERT INTO equipment_works (equipment_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, wid]);
      }
    }

    return module.exports.findById(id, companyId);
  },

  /**
   * Удаляет оборудование по ID.
   * @async
   * @param {number} id - Идентификатор оборудования
   * @returns {Promise<boolean>} true если удалено, иначе false
   */
  remove: async (id, companyId) => {
    const { rowCount } = await query('DELETE FROM equipment WHERE id = $1 AND company_id = $2', [id, companyId]);
    return rowCount > 0;
  },

  /**
   * Создаёт несколько единиц оборудования за раз.
   * @async
   * @param {Array<Object>} items - Массив данных оборудования (см. create)
   * @returns {Promise<Array<Object>>} Список созданного оборудования
   */
  createMany: async (items, companyId) => {
    const results = [];
    for (const item of items) {
      results.push(await module.exports.create(item, companyId));
    }
    return results;
  },
};
