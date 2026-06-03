const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const { getUpcomingTasks } = require('../utils/schedule');
const Employee = require('../models/employee');
const Room = require('../models/room');
const Equipment = require('../models/equipment');

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userPermissions = req.user.permissions || {};
    const isAdmin = userPermissions.settings === 'full';

    if (isAdmin) {
      const all = await Notification.findAll();
      return res.json(all);
    }

    const employee = await Employee.findById(userId);
    if (!employee) {
      return res.json(await Notification.findByUser(userId));
    }

    const upcoming = await getUpcomingTasks(7);
    const myTasks = upcoming.filter(t => t.employeeId === employee.id);

    for (const task of myTasks) {
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

      await Notification.create({
        userId,
        type,
        title,
        message: `${task.workName} — ${task.equipmentName} (${task.inventoryNumber})`,
        equipmentId: task.equipmentId,
        workId: task.workId,
      });
    }

    const notifications = await Notification.findByUser(userId);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;
    const userPermissions = req.user.permissions || {};
    const isAdmin = userPermissions.settings === 'full';

    if (isAdmin) {
      const all = await Notification.findAll();
      const count = all.filter(n => !n.read).length;
      return res.json({ count });
    }

    const unread = await Notification.findUnread(userId);
    res.json({ count: unread.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.markRead(req.params.id);
    if (!notif) return res.status(404).json({ error: 'Not found' });
    res.json(notif);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await Notification.markAllRead(req.user.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Notification.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
