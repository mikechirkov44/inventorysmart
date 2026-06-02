const express = require('express');
const cors = require('cors');
const path = require('path');
const { migrate } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

async function start() {
  // Run database migrations
  await migrate();

  // Ensure default admin exists
  const User = require('./models/user');
  await User.ensureAdmin();

  // Public routes (no auth)
  const authRoutes = require('./routes/auth');
  const setupRoutes = require('./routes/setup');
  app.use('/api/auth', authRoutes);
  app.use('/api/setup', setupRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const { authenticate } = require('./middleware/auth');

  app.use('/api', (req, res, next) => {
    if (req.method === 'OPTIONS') return next();
    if (req.path === '/setup' || req.path.startsWith('/setup/')) return next();
    if (req.path === '/auth' || req.path.startsWith('/auth/')) return next();
    if (req.path === '/health') return next();
    authenticate(req, res, next);
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

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
