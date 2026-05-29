const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const Equipment = require('../models/equipment');

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'excel-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  }
});

// POST import from Excel
router.post('/excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    // Map Excel columns to equipment fields
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
    
    const created = Equipment.createMany(equipmentData);
    
    // Clean up uploaded file
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

// GET template download
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
