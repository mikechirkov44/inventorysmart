/**
 * @module SparePartModel
 * @description Модель для управления запасными частями (spare_parts).
 * Хранит информацию о запчастях: название, артикул, производитель,
 * единицу измерения, минимальный остаток и текущее количество.
 * Поддерживает связь с оборудованием и работами.
 */

const { query } = require('../db');

/**
 * Преобразует строку из БД в объект запчасти.
 * @param {Object|null} row - Строка из таблицы spare_parts
 * @returns {Object|null} Объект запчасти или null
 */
function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    article: row.article,
    manufacturer: row.manufacturer,
    unit: row.unit || 'шт',
    minStock: row.min_stock,
    quantity: row.quantity,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  /**
   * Получает все запчасти со связями (equipmentIds, workLinks).
   * @async
   * @returns {Promise<Array<Object>>} Список запчастей
   */
  findAll: async () => {
    const { rows: parts } = await query('SELECT * FROM spare_parts ORDER BY name');
    const { rows: spEq } = await query('SELECT * FROM spare_parts_equipment');
    const { rows: spWk } = await query('SELECT * FROM spare_parts_works');
    return parts.map(sp => ({
      ...mapRow(sp),
      equipmentIds: spEq.filter(e => e.spare_part_id === sp.id).map(e => e.equipment_id),
      workLinks: spWk.filter(w => w.spare_part_id === sp.id).map(w => ({ workId: w.work_id, quantity: w.quantity || 0 }))
    }));
  },

  /**
   * Находит запчасть по ID со связями.
   * @async
   * @param {number} id - Идентификатор запчасти
   * @returns {Promise<Object|null>} Объект запчасти или null
   */
  findById: async (id) => {
    const { rows } = await query('SELECT * FROM spare_parts WHERE id = $1', [id]);
    if (!rows[0]) return null;
    const { rows: spEq } = await query('SELECT equipment_id FROM spare_parts_equipment WHERE spare_part_id = $1', [id]);
    const { rows: spWk } = await query('SELECT work_id, quantity FROM spare_parts_works WHERE spare_part_id = $1', [id]);
    return {
      ...mapRow(rows[0]),
      equipmentIds: spEq.map(e => e.equipment_id),
      workLinks: spWk.map(w => ({ workId: w.work_id, quantity: w.quantity || 0 }))
    };
  },

  /**
   * Создаёт запчасть с привязкой к оборудованию и работам.
   * @async
   * @param {Object} data - Данные запчасти
   * @param {string} [data.name] - Название
   * @param {string} [data.article] - Артикул
   * @param {string} [data.manufacturer] - Производитель
   * @param {string} [data.unit] - Единица измерения (по умолчанию 'шт')
   * @param {number} [data.minStock] - Минимальный остаток
   * @param {number} [data.quantity] - Текущее количество
   * @param {Array<number>} [data.equipmentIds] - ID связанного оборудования
   * @param {Array<Object>} [data.workLinks] - Связи с работами [{workId, quantity}]
   * @returns {Promise<Object>} Созданная запчасть со связями
   */
  create: async (data) => {
    let equipmentIds = data.equipmentIds || [];
    let workLinks = data.workLinks || [];
    if (typeof equipmentIds === 'string') { try { equipmentIds = JSON.parse(equipmentIds); } catch (_) { equipmentIds = []; } }
    if (typeof workLinks === 'string') { try { workLinks = JSON.parse(workLinks); } catch (_) { workLinks = []; } }
    // Backward compat: convert workIds array to workLinks
    if (data.workIds && workLinks.length === 0) {
      let workIds = data.workIds;
      if (typeof workIds === 'string') { try { workIds = JSON.parse(workIds); } catch (_) { workIds = []; } }
      workLinks = workIds.map(id => ({ workId: id, quantity: 0 }));
    }

    const { rows } = await query(
      'INSERT INTO spare_parts (name, article, manufacturer, unit, min_stock, quantity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [data.name || '', data.article || '', data.manufacturer || '', data.unit || 'шт', parseInt(data.minStock) || 0, parseInt(data.quantity) || 0]
    );
    const sp = rows[0];

    for (const eid of equipmentIds) {
      await query('INSERT INTO spare_parts_equipment (spare_part_id, equipment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [sp.id, eid]);
    }
    for (const wl of workLinks) {
      await query('INSERT INTO spare_parts_works (spare_part_id, work_id, quantity) VALUES ($1, $2, $3) ON CONFLICT (spare_part_id, work_id) DO UPDATE SET quantity = $3', [sp.id, wl.workId, parseInt(wl.quantity) || 0]);
    }

    return await module.exports.findById(sp.id);
  },

  /**
   * Обновляет запчасть по ID, включая связи с оборудованием и работами.
   * @async
   * @param {number} id - Идентификатор запчасти
   * @param {Object} data - Данные для обновления
   * @param {Array<number>} [data.equipmentIds] - Новый список ID оборудования
   * @param {Array<Object>} [data.workLinks] - Новый список связей с работами
   * @returns {Promise<Object|null>} Обновлённая запчасть или null
   */
  update: async (id, data) => {
    const fieldMap = { minStock: 'min_stock' };
    const mapped = {};
    for (const [key, val] of Object.entries(data)) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === 'equipmentIds' || key === 'workIds' || key === 'workLinks') continue;
      const col = fieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      mapped[col] = val;
    }
    mapped.updated_at = new Date();

    if (Object.keys(mapped).length > 1) {
      const keys = Object.keys(mapped);
      const sets = keys.map((k, i) => `${k} = $${i + 1}`);
      const vals = keys.map(k => mapped[k]);
      vals.push(id);
      await query(`UPDATE spare_parts SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    }

    if (data.equipmentIds !== undefined) {
      let ids = data.equipmentIds;
      if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch (_) { ids = []; } }
      await query('DELETE FROM spare_parts_equipment WHERE spare_part_id = $1', [id]);
      for (const eid of ids) {
        await query('INSERT INTO spare_parts_equipment (spare_part_id, equipment_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, eid]);
      }
    }

    let workLinks = data.workLinks;
    if (workLinks === undefined && data.workIds !== undefined) {
      // Backward compat: convert workIds to workLinks
      let ids = data.workIds;
      if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch (_) { ids = []; } }
      workLinks = ids.map(wid => ({ workId: wid, quantity: 0 }));
    }
    if (workLinks !== undefined) {
      if (typeof workLinks === 'string') { try { workLinks = JSON.parse(workLinks); } catch (_) { workLinks = []; } }
      await query('DELETE FROM spare_parts_works WHERE spare_part_id = $1', [id]);
      for (const wl of workLinks) {
        await query('INSERT INTO spare_parts_works (spare_part_id, work_id, quantity) VALUES ($1, $2, $3) ON CONFLICT (spare_part_id, work_id) DO UPDATE SET quantity = $3', [id, wl.workId, parseInt(wl.quantity) || 0]);
      }
    }

    return await module.exports.findById(id);
  },

  /**
   * Удаляет запчасть по ID.
   * @async
   * @param {number} id - Идентификатор запчасти
   * @returns {Promise<boolean>} true если удалена, иначе false
   */
  remove: async (id) => {
    const { rowCount } = await query('DELETE FROM spare_parts WHERE id = $1', [id]);
    return rowCount > 0;
  },

  /**
   * Списывает запчасти со склада (уменьшает количество).
   * @async
   * @param {Array<Object>} items - Список к списанию [{sparePartId, quantity}]
   * @returns {Promise<Array<Object>>} Обновлённые запчасти
   */
  deductStock: async (items) => {
    const updated = [];
    for (const { sparePartId, quantity } of items) {
      const qty = parseInt(quantity) || 0;
      if (qty <= 0) continue;
      const { rows } = await query(
        'UPDATE spare_parts SET quantity = GREATEST(0, quantity - $1), updated_at = NOW() WHERE id = $2 RETURNING *',
        [qty, sparePartId]
      );
      if (rows[0]) updated.push(mapRow(rows[0]));
    }
    return updated;
  },

  /**
   * Пополняет запасы запчастей (увеличивает количество).
   * @async
   * @param {Array<Object>} items - Список к пополнению [{sparePartId, quantity}]
   * @returns {Promise<Array<Object>>} Обновлённые запчасти
   */
  replenishStock: async (items) => {
    const updated = [];
    for (const { sparePartId, quantity } of items) {
      const qty = parseInt(quantity) || 0;
      if (qty <= 0) continue;
      const { rows } = await query(
        'UPDATE spare_parts SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [qty, sparePartId]
      );
      if (rows[0]) updated.push(mapRow(rows[0]));
    }
    return updated;
  }
};
