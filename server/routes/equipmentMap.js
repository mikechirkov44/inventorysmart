const express = require('express');
const router = express.Router();
const EquipmentMap = require('../models/equipmentMap');
const { requirePermission, requireAdministrator } = require('../middleware/auth');
const { validateLayoutPayload, MapValidationError } = require('../utils/equipmentMapValidation');

const edit = [requirePermission('equipment', 'edit'), requireAdministrator];
const nameFrom = (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) { res.status(400).json({ error: 'Укажите название' }); return null; }
  if (name.length > 255) { res.status(400).json({ error: 'Название слишком длинное' }); return null; }
  return name;
};
const sendError = (res, error) => {
  if (error.code === '23505') return res.status(409).json({ error: 'Такое название уже используется' });
  if (error instanceof MapValidationError || error.statusCode) return res.status(error.statusCode || 400).json({ error: error.message, currentVersion: error.currentVersion });
  console.error('Equipment map error:', error);
  return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};

router.get('/buildings', requirePermission('equipment', 'view'), async (req, res) => {
  try { res.json(await EquipmentMap.listBuildings(req.user.companyId)); } catch (error) { sendError(res, error); }
});
router.post('/buildings', ...edit, async (req, res) => {
  const name = nameFrom(req, res); if (!name) return;
  try { res.status(201).json(await EquipmentMap.createBuilding(req.user.companyId, { ...req.body, name })); } catch (error) { sendError(res, error); }
});
router.patch('/buildings/:id', ...edit, async (req, res) => {
  const name = nameFrom(req, res); if (!name) return;
  try { const item = await EquipmentMap.updateBuilding(req.user.companyId, req.params.id, { ...req.body, name }); item ? res.json(item) : res.status(404).json({ error: 'Здание не найдено' }); } catch (error) { sendError(res, error); }
});
router.delete('/buildings/:id', ...edit, async (req, res) => {
  try { (await EquipmentMap.deleteBuilding(req.user.companyId, req.params.id)) ? res.json({ deleted: true }) : res.status(404).json({ error: 'Здание не найдено' }); } catch (error) { sendError(res, error); }
});
router.post('/buildings/:buildingId/floors', ...edit, async (req, res) => {
  const name = nameFrom(req, res); if (!name) return;
  try { const item = await EquipmentMap.createFloor(req.user.companyId, req.params.buildingId, { ...req.body, name }); item ? res.status(201).json(item) : res.status(404).json({ error: 'Здание не найдено' }); } catch (error) { sendError(res, error); }
});
router.patch('/floors/:id', ...edit, async (req, res) => {
  const name = nameFrom(req, res); if (!name) return;
  try { const item = await EquipmentMap.updateFloor(req.user.companyId, req.params.id, { ...req.body, name }); item ? res.json(item) : res.status(404).json({ error: 'Этаж не найден' }); } catch (error) { sendError(res, error); }
});
router.delete('/floors/:id', ...edit, async (req, res) => {
  try { (await EquipmentMap.deleteFloor(req.user.companyId, req.params.id)) ? res.json({ deleted: true }) : res.status(404).json({ error: 'Этаж не найден' }); } catch (error) { sendError(res, error); }
});
router.get('/floors/:id', requirePermission('equipment', 'view'), async (req, res) => {
  try { const item = await EquipmentMap.getFloor(req.user.companyId, req.params.id); item ? res.json(item) : res.status(404).json({ error: 'Этаж не найден' }); } catch (error) { sendError(res, error); }
});
router.put('/floors/:id/layout', ...edit, async (req, res) => {
  try {
    const floor = await EquipmentMap.getFloor(req.user.companyId, req.params.id);
    if (!floor) return res.status(404).json({ error: 'Этаж не найден' });
    const layout = validateLayoutPayload(req.body, { width: floor.canvasWidth, height: floor.canvasHeight });
    res.json(await EquipmentMap.saveLayout(req.user.companyId, req.params.id, layout));
  } catch (error) { sendError(res, error); }
});
router.get('/unplaced-equipment', requirePermission('equipment', 'view'), async (req, res) => {
  try { res.json(await EquipmentMap.listUnplaced(req.user.companyId, req.query.search)); } catch (error) { sendError(res, error); }
});

module.exports = router;
