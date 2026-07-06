/**
 * @module Маршруты импорта данных
 * @description API для импорта оборудования из Excel-файлов и скачивания шаблона импорта.
 */

const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const Equipment = require('../models/equipment');
const { excelUpload } = require('../utils/upload');
const { requirePermission } = require('../middleware/auth');

/**
 * Читает первый лист Excel-файла и возвращает строки как объекты по заголовкам.
 * @param {string} filePath
 * @returns {Promise<Array<Record<string, string>>>}
 */
async function readExcelRows(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const headers = [];
  const rows = [];

  worksheet.eachRow((row, rowNumber) => {
    const values = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = cell.value;
      values[colNumber - 1] = value == null ? '' : String(value);
    });

    if (rowNumber === 1) {
      values.forEach((header) => headers.push(header));
      return;
    }

    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = values[index] ?? '';
    });
    rows.push(record);
  });

  return rows;
}

/**
 * @route POST /import/excel
 * @description Импорт оборудования из Excel-файла (.xlsx)
 */
router.post('/excel', requirePermission('import', 'edit'), excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const jsonData = await readExcelRows(req.file.path);

    const equipmentData = jsonData.map(row => {
      const tasks = [];
      if (row['Работы'] || row['maintenanceTasks']) {
        const taskString = row['Работы'] || row['maintenanceTasks'];
        const taskNames = taskString.split(',').map(t => t.trim()).filter(t => t);
        taskNames.forEach(taskName => {
          tasks.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: taskName,
            description: '',
            frequencyDays: 30,
            lastCompleted: null
          });
        });
      }

      return {
        name: row['Наименование'] || row['name'] || '',
        inventoryNumber: row['Инвентарный номер'] || row['inventoryNumber'] || '',
        description: row['Описание'] || row['description'] || '',
        location: row['Расположение'] || row['location'] || '',
        category: row['Категория'] || row['category'] || '',
        maintenanceTasks: tasks
      };
    });

    const created = await Equipment.createMany(equipmentData, req.user.companyId);

    const fs = require('fs');
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({
      message: `Successfully imported ${created.length} equipment items`,
      equipment: created
    });
  } catch (error) {
    console.error('Route error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * @route GET /import/template
 * @description Скачивание шаблона Excel-файла для импорта оборудования
 */
router.get('/template', requirePermission('import', 'view'), async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Оборудование');
    worksheet.addRows([
      ['Наименование', 'Инвентарный номер', 'Описание', 'Расположение', 'Категория', 'Работы'],
      ['Насос центробежный', 'INV-001', 'Насос для перекачки воды', 'Цех №1', 'Насосы', 'Замена масла, Проверка уплотнений, Промывка фильтров'],
      ['Компрессор воздуха', 'INV-002', 'Винтовой компрессор', 'Цех №2', 'Компрессоры', 'Замена масла, Проверка фильтров, Контроль давления']
    ]);

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Disposition', 'attachment; filename=equipment_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
