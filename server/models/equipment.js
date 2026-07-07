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
  'commissioningDate', 'instructionPdf', 'instructionMd', 'photo', 'workIds', 'workLinks',
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

function mapWorkLinkRow(row) {
  return {
    workId: row.work_id,
    startDate: serializeDate(row.start_date) || serializeDate(new Date()),
  };
}

function attachWorkLinks(equipment, workLinks) {
  return {
    ...equipment,
    workLinks,
    workIds: workLinks.map((link) => link.workId),
  };
}

function linksFromRows(equipmentId, rows) {
  return rows
    .filter((row) => row.equipment_id === equipmentId)
    .map(mapWorkLinkRow);
}

function normalizeWorkLinks(data) {
  if (data.workLinks !== undefined) {
    let links = data.workLinks;
    if (typeof links === 'string') {
      try { links = JSON.parse(links); } catch (_) { links = []; }
    }
    if (!Array.isArray(links)) return [];
    return links.map((link) => ({
      workId: link.workId,
      startDate: serializeDate(link.startDate) || serializeDate(new Date()),
    }));
  }

  if (data.workIds !== undefined) {
    let ids = data.workIds;
    if (typeof ids === 'string') {
      try { ids = JSON.parse(ids); } catch (_) { ids = []; }
    }
    if (!Array.isArray(ids)) return [];
    const today = serializeDate(new Date());
    return ids.map((workId) => ({ workId, startDate: today }));
  }

  return null;
}

async function syncEquipmentWorks(equipmentId, workLinks) {
  await query('DELETE FROM equipment_works WHERE equipment_id = $1', [equipmentId]);
  for (const link of workLinks) {
    await query(
      'INSERT INTO equipment_works (equipment_id, work_id, start_date) VALUES ($1, $2, $3)',
      [equipmentId, link.workId, link.startDate],
    );
  }
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
   * Получает всё оборудование с привязанными работами.
   * @async
   * @returns {Promise<Array<Object>>} Список оборудования с workLinks и workIds
   */
  findAll: async (companyId) => {
    const { rows: equipment } = await query(`
      SELECT e.*, ec.name as category_name 
      FROM equipment e 
      LEFT JOIN equipment_categories ec ON e.category_id = ec.id 
      WHERE e.company_id = $1 
      ORDER BY e.name
    `, [companyId]);
    const { rows: eqWorks } = await query('SELECT equipment_id, work_id, start_date FROM equipment_works');
    return equipment.map((eq) => {
      const workLinks = linksFromRows(eq.id, eqWorks);
      return attachWorkLinks(mapRow(eq), workLinks);
    });
  },

  /**
   * Находит оборудование по ID вместе с привязанными работами.
   * @async
   * @param {number} id - Идентификатор оборудования
   * @returns {Promise<Object|null>} Оборудование с workLinks или null
   */
  findById: async (id, companyId) => {
    const { rows } = await query(`
      SELECT e.*, ec.name as category_name 
      FROM equipment e 
      LEFT JOIN equipment_categories ec ON e.category_id = ec.id 
      WHERE e.id = $1 AND e.company_id = $2
    `, [id, companyId]);
    if (!rows[0]) return null;
    const { rows: eqWorks } = await query(
      'SELECT work_id, start_date FROM equipment_works WHERE equipment_id = $1',
      [id],
    );
    const workLinks = eqWorks.map(mapWorkLinkRow);
    return attachWorkLinks(mapRow(rows[0]), workLinks);
  },

  /**
   * Находит оборудование по QR-коду.
   * @async
   * @param {string} qrCode - QR-код оборудования
   * @returns {Promise<Object|null>} Оборудование с workLinks или null
   */
  findByQrCode: async (qrCode) => {
    const { rows } = await query(`
      SELECT e.*, ec.name as category_name 
      FROM equipment e 
      LEFT JOIN equipment_categories ec ON e.category_id = ec.id 
      WHERE e.qr_code = $1
    `, [qrCode]);
    if (!rows[0]) return null;
    const { rows: eqWorks } = await query(
      'SELECT work_id, start_date FROM equipment_works WHERE equipment_id = $1',
      [rows[0].id],
    );
    const workLinks = eqWorks.map(mapWorkLinkRow);
    return attachWorkLinks(mapRow(rows[0]), workLinks);
  },

  /**
   * Находит оборудование по инвентарному номеру.
   * @async
   * @param {string} inventoryNumber - Инвентарный номер
   * @returns {Promise<Object|null>} Оборудование с workLinks или null
   */
  findByInventoryNumber: async (inventoryNumber) => {
    const { rows } = await query(`
      SELECT e.*, ec.name as category_name 
      FROM equipment e 
      LEFT JOIN equipment_categories ec ON e.category_id = ec.id 
      WHERE e.inventory_number = $1
    `, [inventoryNumber]);
    if (!rows[0]) return null;
    const { rows: eqWorks } = await query(
      'SELECT work_id, start_date FROM equipment_works WHERE equipment_id = $1',
      [rows[0].id],
    );
    const workLinks = eqWorks.map(mapWorkLinkRow);
    return attachWorkLinks(mapRow(rows[0]), workLinks);
  },

  /**
   * Создаёт новое оборудование с привязкой к работам.
   * @async
   * @param {Object} data - Данные оборудования
   * @returns {Promise<Object>} Созданное оборудование
   */
  create: async (data, companyId) => {
    const workLinks = normalizeWorkLinks(data) || [];

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

    await syncEquipmentWorks(eq.id, workLinks);

    return attachWorkLinks(mapRow(eq), workLinks);
  },

  /**
   * Обновляет оборудование по ID, включая привязку к работам.
   * @async
   * @param {number} id - Идентификатор оборудования
   * @param {Object} data - Данные для обновления
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
      if (key === 'workIds' || key === 'workLinks') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (key === 'yearOfManufacture') {
        mapped[col] = val && String(val).trim() !== '' ? parseInt(val, 10) : null;
      } else if (key === 'commissioningDate') {
        mapped[col] = serializeDate(val);
      } else if (key === 'roomId' || key === 'categoryId') {
        mapped[col] = val && String(val).trim() !== '' ? val : null;
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

    const workLinks = normalizeWorkLinks(safeData);
    if (workLinks !== null) {
      await syncEquipmentWorks(id, workLinks);
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
