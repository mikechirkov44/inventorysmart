const { query } = require('../db');

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    documentNumber: row.document_number,
    date: row.date,
    supplier: row.supplier,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapItemRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    receiptId: row.receipt_id,
    sparePartId: row.spare_part_id,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    createdAt: row.created_at
  };
}

async function generateDocumentNumber() {
  const year = new Date().getFullYear();
  const prefix = `ПЗИП-${year}-`;
  const { rows } = await query(
    `SELECT document_number FROM spare_part_receipts
     WHERE document_number LIKE $1
     ORDER BY document_number DESC LIMIT 1`,
    [`${prefix}%`]
  );
  if (rows.length === 0) {
    return `${prefix}001`;
  }
  const lastNum = parseInt(rows[0].document_number.replace(prefix, ''), 10);
  const nextNum = (lastNum + 1).toString().padStart(3, '0');
  return `${prefix}${nextNum}`;
}

module.exports = {
  findAll: async () => {
    const { rows } = await query('SELECT * FROM spare_part_receipts ORDER BY date DESC, created_at DESC');
    const receipts = rows.map(mapRow);

    for (const r of receipts) {
      const { rows: items } = await query(
        `SELECT spi.*, sp.name as spare_part_name, sp.article as spare_part_article, sp.unit as spare_part_unit
         FROM spare_part_receipt_items spi
         LEFT JOIN spare_parts sp ON sp.id = spi.spare_part_id
         WHERE spi.receipt_id = $1`,
        [r.id]
      );
      r.items = items.map(i => ({
        ...mapItemRow(i),
        sparePartName: i.spare_part_name,
        sparePartArticle: i.spare_part_article,
        sparePartUnit: i.spare_part_unit
      }));
    }

    return receipts;
  },

  findById: async (id) => {
    const { rows } = await query('SELECT * FROM spare_part_receipts WHERE id = $1', [id]);
    const receipt = mapRow(rows[0]);
    if (!receipt) return null;

    const { rows: items } = await query(
      `SELECT spi.*, sp.name as spare_part_name, sp.article as spare_part_article, sp.unit as spare_part_unit
       FROM spare_part_receipt_items spi
       LEFT JOIN spare_parts sp ON sp.id = spi.spare_part_id
       WHERE spi.receipt_id = $1`,
      [id]
    );
    receipt.items = items.map(i => ({
      ...mapItemRow(i),
      sparePartName: i.spare_part_name,
      sparePartArticle: i.spare_part_article,
      sparePartUnit: i.spare_part_unit
    }));

    return receipt;
  },

  generateDocumentNumber,

  create: async (data) => {
    const client = await require('../db').pool.connect();
    try {
      await client.query('BEGIN');

      const docNumber = data.documentNumber || await generateDocumentNumber();
      const { rows: receiptRows } = await client.query(
        'INSERT INTO spare_part_receipts (document_number, date, supplier, notes) VALUES ($1, $2, $3, $4) RETURNING *',
        [docNumber, data.date || new Date().toISOString().split('T')[0], data.supplier || '', data.notes || '']
      );
      const receipt = receiptRows[0];

      let items = data.items || [];
      if (typeof items === 'string') { try { items = JSON.parse(items); } catch (_) { items = []; } }

      for (const item of items) {
        const qty = parseInt(item.quantity) || 0;
        if (qty <= 0 || !item.sparePartId) continue;

        await client.query(
          'INSERT INTO spare_part_receipt_items (receipt_id, spare_part_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
          [receipt.id, item.sparePartId, qty, parseFloat(item.unitPrice) || 0]
        );

        await client.query(
          'UPDATE spare_parts SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
          [qty, item.sparePartId]
        );
      }

      await client.query('COMMIT');
      return await module.exports.findById(receipt.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  remove: async (id) => {
    const client = await require('../db').pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: items } = await client.query(
        'SELECT spare_part_id, quantity FROM spare_part_receipt_items WHERE receipt_id = $1',
        [id]
      );

      for (const item of items) {
        await client.query(
          'UPDATE spare_parts SET quantity = GREATEST(0, quantity - $1), updated_at = NOW() WHERE id = $2',
          [item.quantity, item.spare_part_id]
        );
      }

      await client.query('DELETE FROM spare_part_receipt_items WHERE receipt_id = $1', [id]);
      const { rowCount } = await client.query('DELETE FROM spare_part_receipts WHERE id = $1', [id]);

      await client.query('COMMIT');
      return rowCount > 0;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};
