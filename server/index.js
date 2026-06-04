/**
 * @module index
 * @description Точка входа Express-сервера. Настройка middleware, маршрутов и запуск
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { migrate } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (nginx in front)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — restrict to known origins
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').filter(Boolean);
if (ALLOWED_ORIGINS.length > 0) {
  app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
} else {
  app.use(cors());
}

// Body size limit
app.use(express.json({ limit: '1mb' }));

// Static files — require auth via separate route (uploads served through authenticated proxy)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global rate limiter — 200 req/min per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте позже.' }
});
app.use('/api', globalLimiter);

// Strict rate limiter for auth endpoints — 10 req/min per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Попробуйте через минуту.' }
});

/**
 * Инициализирует сервер: выполняет миграции БД, регистрирует
 * публичные и защищённые маршруты, запускает HTTP-прослушивание
 * @returns {Promise<void>}
 */
async function start() {
  // Run database migrations
  await migrate();

  // Public routes (no auth) — with strict rate limiting
  const authRoutes = require('./routes/auth');
  const setupRoutes = require('./routes/setup');
  const superadminRoutes = require('./routes/superadmin');
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/setup', authLimiter, setupRoutes);
  app.use('/api/superadmin', authLimiter, superadminRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const { authenticate } = require('./middleware/auth');
  const Company = require('./models/company');

  app.use('/api', (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    if (req.path === '/setup' || req.path.startsWith('/setup/')) return next();
    if (req.path === '/auth' || req.path.startsWith('/auth/')) return next();
    if (req.path === '/health') return next();
    if (req.path === '/superadmin' || req.path.startsWith('/superadmin/')) return next();
    authenticate(req, res, next);
  });

  // License check — block access if demo expired
  app.use('/api', async (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    if (req.path === '/company' || req.path.startsWith('/company/')) return next();
    if (req.path === '/auth' || req.path.startsWith('/auth/')) return next();
    if (req.path === '/setup' || req.path.startsWith('/setup/')) return next();
    if (req.path === '/health') return next();
    if (!req.user || !req.user.companyId) return next();

    try {
      const license = await Company.getLicenseStatus(req.user.companyId);
      if (license.status === 'blocked') {
        return res.status(403).json({
          error: 'Демо-режим истёк',
          message: license.message,
          licenseBlocked: true
        });
      }
      req.license = license;
      next();
    } catch {
      res.status(500).json({ error: 'Ошибка проверки лицензии' });
    }
  });

  // Protected routes
  const equipmentRoutes = require('./routes/equipment');
  const workOrderRoutes = require('./routes/work-orders');
  const scanRoutes = require('./routes/scan');
  const importRoutes = require('./routes/import');
  const worksRoutes = require('./routes/works');
  const roomsRoutes = require('./routes/rooms');
  const employeesRoutes = require('./routes/employees');
  const usersRoutes = require('./routes/users');
  const calendarRoutes = require('./routes/calendar');
  const notificationsRoutes = require('./routes/notifications');
  const incidentsRoutes = require('./routes/incidents');
  const sparePartsRoutes = require('./routes/spareParts');
  const sparePartsReceiptsRoutes = require('./routes/sparePartsReceipts');
  const analyticsRoutes = require('./routes/analytics');
  const scheduleRoutes = require('./routes/schedule');
  const companyRoutes = require('./routes/company');
  const positionsRoutes = require('./routes/positions');

  app.use('/api/equipment', equipmentRoutes);
  app.use('/api/work-orders', workOrderRoutes);
  app.use('/api/scan', scanRoutes);
  app.use('/api/import', importRoutes);
  app.use('/api/works', worksRoutes);
  app.use('/api/rooms', roomsRoutes);
  app.use('/api/employees', employeesRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/incidents', incidentsRoutes);
  app.use('/api/spare-parts', sparePartsRoutes);
  app.use('/api/spare-parts-receipts', sparePartsReceiptsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/schedule', scheduleRoutes);
  app.use('/api/company', companyRoutes);
  app.use('/api/positions', positionsRoutes);

  // Global error handler — never leak internals
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
