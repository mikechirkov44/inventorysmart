const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure default admin exists
const User = require('./models/user');
User.ensureAdmin();

// Public routes (no auth)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth middleware for all API routes below
const { authenticate } = require('./middleware/auth');
app.use('/api', authenticate);

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
