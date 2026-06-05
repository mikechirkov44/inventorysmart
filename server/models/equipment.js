/**
 * @module EquipmentModel
 * @description Модель для управления оборудованием (equipment).
 * Хранит информацию об оборудовании: QR-код, инвентарный номер,
 * категорию, статус, расположение и связанные работы.
 */

const { query } = require('../db');

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
    category: row.category,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  /**
   * Получает всё оборудование с привязанными ID работ.
   * @async
   * @returns {Promise<Array<Object>>} Список оборудования с полем workIds
   */
  findAll: async (companyId) => {
    const { rows: equipment } = await query('SELECT * FROM equipment WHERE company_id = $1 ORDER BY name', [companyId]);
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
    const { rows } = await query('SELECT * FROM equipment WHERE id = $1 AND company_id = $2', [id, companyId]);
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
    const { rows } = await query('SELECT * FROM equipment WHERE qr_code = $1', [qrCode]);
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
    const { rows } = await query('SELECT * FROM equipment WHERE inventory_number = $1', [inventoryNumber]);
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
   * @param {string} [data.category] - Категория
   * @param {string} [data.status] - Статус (working/broken/etc)
   * @param {Array<number>} [data.workIds] - Массив ID связанных работ
   * @returns {Promise<Object>} Созданное оборудование с workIds
   */
  create: async (data, companyId) => {
    let workIds = data.workIds || [];
    if (typeof workIds === 'string') { try { workIds = JSON.parse(workIds); } catch (_) { workIds = []; } }

    const { rows } = await query(
      'INSERT INTO equipment (name, inventory_number, description, photo, room_id, category, status, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [data.name, data.inventoryNumber || '', data.description || '', data.photo || null, data.roomId || null, data.category || '', data.status || 'working', companyId]
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
    const fieldMap = { inventoryNumber: 'inventory_number', roomId: 'room_id' };
    const mapped = {};
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id' || key === 'qrCode' || key === 'createdAt' || key === 'updatedAt' || key === 'workIds') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      mapped[col] = val;
    }
    mapped.updated_at = new Date();

    if (Object.keys(mapped).length > 1) {
      const keys = Object.keys(mapped);
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const vals = keys.map(k => mapped[k]);
      vals.push(id);
      vals.push(companyId);
      await query(`UPDATE equipment SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND company_id = $${vals.length}`, vals);
    }

    if (data.workIds !== undefined) {
      let ids = data.workIds;
      if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch (_) { ids = []; } }
      await query('DELETE FROM equipment_works WHERE equipment_id = $1', [id]);
      for (const wid of ids) {
        await query('INSERT INTO equipment_works (equipment_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, wid]);
      }
    }

    return await module.exports.findById(id, companyId);
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
  createMany: async (items) => {
    const results = [];
    for (const item of items) { results.push(await module.exports.create(item)); }
    return results;
  }
};
