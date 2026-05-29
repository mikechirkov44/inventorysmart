const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const { getUpcomingTasks } = require('../utils/schedule');
const Employee = require('../models/employee');
const Room = require('../models/room');
const Equipment = require('../models/equipment');

// GET /api/notifications - get notifications for current user + generate upcoming
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'admin') {
      const all = Notification.findAll();
      return res.json(all);
    }

    const employee = Employee.findById(userId);
    if (!employee) {
      return res.json(Notification.findByUser(userId));
    }

    const upcoming = getUpcomingTasks(7);
    const myTasks = upcoming.filter(t => t.employeeId === employee.id);

    myTasks.forEach(task => {
      const dueDate = new Date(task.nextDue);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((dueDate - today) / 86400000);

      let type = 'upcoming_work';
      let title = 'Предстоящая работа';
      if (task.isOverdue || daysUntil <= 0) {
        type = 'overdue_work';
        title = 'Просроченная работа';
      } else if (daysUntil <= 2) {
        type = 'upcoming_work';
        title = 'Работа через ' + daysUntil + ' дн.';
      }

      Notification.create({
        userId,
        type,
        title,
        message: `${task.workName} — ${task.equipmentName} (${task.inventoryNumber})`,
        equipmentId: task.equipmentId,
        workId: task.workId,
      });
    });

    const notifications = Notification.findByUser(userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'admin') {
      const all = Notification.findAll();
      const count = all.filter(n => !n.read).length;
      return res.json({ count });
    }

    const unread = Notification.findUnread(userId);
    res.json({ count: unread.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', (req, res) => {
  try {
    const notif = Notification.markRead(req.params.id);
    if (!notif) return res.status(404).json({ error: 'Not found' });
    res.json(notif);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', (req, res) => {
  try {
    Notification.markAllRead(req.user.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', (req, res) => {
  try {
    const deleted = Notification.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
