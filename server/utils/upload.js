/**
 * Общая конфигурация загрузки файлов (multer).
 * Используется в маршрутах equipment, work-orders, incidents, company, import.
 */

const multer = require('multer');
const path = require('path');

// Каталог для загруженных файлов
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * Генератор уникальных имён файлов.
 * Формат: [prefix]-timestamp-random.ext
 * @param {string} prefix - префикс имени файла (например, 'incident', 'excel')
 * @returns {function} - функция для multer storage
 */
function createStorage(prefix = '') {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const name = prefix ? `${prefix}-${uniqueSuffix}` : uniqueSuffix;
      cb(null, name + path.extname(file.originalname));
    }
  });
}

/**
 * Фильтр для изображений (jpeg, jpg, png, gif, webp).
 * Проверяет и расширение, и MIME-тип.
 */
function imageFilter(req, file, cb) {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Допустимы только изображения (jpeg, jpg, png, gif, webp)'));
  }
}

/**
 * Фильтр для Excel-файлов (xlsx, xls, csv).
 * Проверяет только расширение.
 */
function excelFilter(req, file, cb) {
  const allowedTypes = /xlsx|xls|csv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (extname) {
    cb(null, true);
  } else {
    cb(new Error('Допустимы только файлы Excel (xlsx, xls, csv)'));
  }
}

/**
 * Фильтр для PDF-файлов.
 */
function pdfFilter(req, file, cb) {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'application/pdf';
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Допустимы только PDF файлы'));
  }
}

// Загрузчик изображений (5 МБ по умолчанию)
const imageUpload = multer({
  storage: createStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter
});

// Загрузчик изображений для инцидентов (10 МБ, префикс 'incident')
const incidentUpload = multer({
  storage: createStorage('incident'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter
});

// Загрузчик Excel-файлов (10 МБ, префикс 'excel')
const excelUpload = multer({
  storage: createStorage('excel'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: excelFilter
});

// Загрузчик PDF-файлов (20 МБ, префикс 'instruction')
const pdfUpload = multer({
  storage: createStorage('instruction'),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: pdfFilter
});

module.exports = { imageUpload, incidentUpload, excelUpload, pdfUpload };
