const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const equipmentRoutes = require('./routes/equipment');
const workOrderRoutes = require('./routes/work-orders');
const scanRoutes = require('./routes/scan');
const importRoutes = require('./routes/import');
const worksRoutes = require('./routes/works');
const roomsRoutes = require('./routes/rooms');
const employeesRoutes = require('./routes/employees');

app.use('/api/equipment', equipmentRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/import', importRoutes);
app.use('/api/works', worksRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/employees', employeesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
