/**
 * @module Маршруты импорта данных
 * @description API для импорта оборудования из Excel-файлов и скачивания шаблона импорта.
 */

const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const Equipment = require('../models/equipment');
const { excelUpload } = require('../utils/upload');

/**
 * @route POST /import/excel
 * @description Импорт оборудования из Excel-файла (.xlsx)
 * @param {File} req.file - Excel-файл с данными оборудования (multipart/form-data)
 * @returns {Object} Результат импорта
 * @returns {string} return.message - Сообщение о количестве импортированных записей
 * @returns {Object[]} return.equipment - Созданное оборудование
 */
router.post('/excel', excelUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
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
    
    const created = await Equipment.createMany(equipmentData);
    
    const fs = require('fs');
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(201).json({
      message: `Successfully imported ${created.length} equipment items`,
      equipment: created
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /import/template
 * @description Скачивание шаблона Excel-файла для импорта оборудования
 * @returns {File} Excel-файл equipment_template.xlsx для скачивания
 */
router.get('/template', (req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Наименование', 'Инвентарный номер', 'Описание', 'Расположение', 'Категория', 'Работы'],
      ['Насос центробежный', 'INV-001', 'Насос для перекачки воды', 'Цех №1', 'Насосы', 'Замена масла, Проверка уплотнений, Промывка фильтров'],
      ['Компрессор воздуха', 'INV-002', 'Винтовой компрессор', 'Цех №2', 'Компрессоры', 'Замена масла, Проверка фильтров, Контроль давления']
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Оборудование');
    
    const tempPath = path.join(__dirname, '..', 'uploads', 'template.xlsx');
    XLSX.writeFile(wb, tempPath);
    
    res.download(tempPath, 'equipment_template.xlsx', (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      const fs = require('fs');
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
