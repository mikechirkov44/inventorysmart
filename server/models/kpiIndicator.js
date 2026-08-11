const { query } = require('../db');

function map(row) {
  if (!row) return null;
  const plan = Number(row.plan_value || 0);
  const actual = Number(row.actual_value || 0);
  const higher = row.higher_is_better !== false;
  const performance = plan === 0 ? 0 : (higher ? actual / plan : (actual === 0 ? 100 : plan / actual)) * 100;
  return {
    id: row.id, name: row.name, code: row.code, unit: row.unit,
    higherIsBetter: higher, active: row.active !== false,
    planValue: plan, actualValue: actual,
    performance: Math.round(performance * 100) / 100,
  };
}

module.exports = {
  findAll: async (companyId, month) => {
    const { rows } = await query(`SELECT i.*, v.plan_value, v.actual_value FROM kpi_indicators i
      LEFT JOIN kpi_indicator_values v ON v.indicator_id=i.id AND v.period_month=$2
      WHERE i.company_id=$1 ORDER BY i.created_at`, [companyId, month]);
    return rows.map(map);
  },
  create: async (data, companyId) => {
    const { rows } = await query(`INSERT INTO kpi_indicators(company_id,name,code,unit,higher_is_better)
      VALUES($1,$2,$3,$4,$5) RETURNING *`, [companyId, data.name, data.code, data.unit || '%', data.higherIsBetter !== false]);
    return map(rows[0]);
  },
  update: async (id, data, companyId) => {
    const { rows } = await query(`UPDATE kpi_indicators SET name=$1,code=$2,unit=$3,higher_is_better=$4,active=$5,updated_at=NOW()
      WHERE id=$6 AND company_id=$7 RETURNING *`, [data.name, data.code, data.unit || '%', data.higherIsBetter !== false, data.active !== false, id, companyId]);
    return map(rows[0]);
  },
  upsertValue: async (id, month, plan, actual, companyId) => {
    const { rows: owned } = await query('SELECT id FROM kpi_indicators WHERE id=$1 AND company_id=$2', [id, companyId]);
    if (!owned.length) return null;
    await query(`INSERT INTO kpi_indicator_values(indicator_id,company_id,period_month,plan_value,actual_value)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT(indicator_id,period_month) DO UPDATE SET plan_value=$4,actual_value=$5,updated_at=NOW()`, [id, companyId, month, plan, actual]);
    return true;
  },
  remove: async (id, companyId) => (await query('DELETE FROM kpi_indicators WHERE id=$1 AND company_id=$2', [id, companyId])).rowCount > 0,
};
