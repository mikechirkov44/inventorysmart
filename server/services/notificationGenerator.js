/**
 * @module NotificationGenerator
 * @description Генератор уведомлений для предстоящих и просроченных работ.
 * Запускается периодически (cron) или при обновлении данных.
 */

const Equipment = require('../models/equipment');
const Work = require('../models/work');
const WorkOrder = require('../models/workOrder');
const Room = require('../models/room');
const Employee = require('../models/employee');
const User = require('../models/user');
const Notification = require('../models/notification');
const Company = require('../models/company');

/**
 * Проверяет и создаёт уведомления о предстоящих и просроченных работах
 * для всех компаний.
 * @async
 */
async function generateWorkNotifications() {
  try {
    const companies = await Company.findAll();
    
    for (const company of companies) {
      await generateForCompany(company.companyId);
    }
  } catch (error) {
    console.error('Error generating work notifications:', error);
  }
}

/**
 * Генерирует уведомления для конкретной компании.
 * @async
 * @param {string} companyId - ID компании
 */
async function generateForCompany(companyId) {
  const allEquipment = await Equipment.findAll(companyId);
  const allWorks = await Work.findAll(companyId);
  const allWorkOrders = await WorkOrder.findAll(companyId);
  const allRooms = await Room.findAll(companyId);
  const allEmployees = await Employee.findAll(companyId);
  const allUsers = await User.findAllByCompany(companyId);
  // Log counts for debugging
  // console.log(`[NotificationGenerator] Company ${companyId}: equipment=${allEquipment.length}, works=${allWorks.length}, orders=${allWorkOrders.length}, rooms=${allRooms.length}, employees=${allEmployees.length}, users=${allUsers.length}`);

  const workMap = {};
  allWorks.forEach(w => { workMap[w.id] = w; });
  const roomMap = {};
  allRooms.forEach(r => { roomMap[r.id] = r; });
  const empMap = {};
  allEmployees.forEach(e => { empMap[e.id] = e; });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = [];
  const upcomingTasks = [];

  allEquipment.forEach(equip => {
    const room = equip.roomId ? roomMap[equip.roomId] : null;
    const employee = room && room.responsibleEmployeeId ? empMap[room.responsibleEmployeeId] : null;
    const equipOrders = allWorkOrders.filter(wo => wo.equipmentId === equip.id);

    let workIds = equip.workIds || [];
    if (!Array.isArray(workIds)) workIds = [];

    workIds.forEach(wid => {
      const work = workMap[wid];
      if (!work) return;

      const completedOrders = equipOrders
        .filter(wo => wo.taskId === wid && wo.status === 'completed' && wo.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      const lastCompleted = completedOrders.length > 0 ? new Date(completedOrders[0].completedAt) : null;

      let plannedDate = null;
      let nextDue = null;
      if (lastCompleted) {
        plannedDate = new Date(lastCompleted);
        plannedDate.setDate(plannedDate.getDate() + (work.frequencyDays || 30));
        plannedDate.setHours(0, 0, 0, 0);
        nextDue = new Date(plannedDate);
      }

      const isOverdue = nextDue ? today >= nextDue : true;

      if (isOverdue && lastCompleted) {
        const daysOverdue = Math.floor((today - nextDue) / 86400000);
        overdueTasks.push({
          equipmentId: equip.id,
          equipmentName: equip.name,
          inventoryNumber: equip.inventoryNumber || '—',
          workId: work.id,
          workName: work.name,
          employeeId: employee ? employee.id : null,
          daysOverdue,
          nextDue
        });
      } else if (!isOverdue && lastCompleted) {
        const daysUntil = Math.ceil((nextDue - today) / 86400000);
        if (daysUntil <= 7) {
          upcomingTasks.push({
            equipmentId: equip.id,
            equipmentName: equip.name,
            inventoryNumber: equip.inventoryNumber || '—',
            workId: work.id,
            workName: work.name,
            employeeId: employee ? employee.id : null,
            daysUntil,
            nextDue
          });
        }
      }
    });
  });

  // Create notifications for overdue works
  for (const task of overdueTasks) {
    const targetUsers = allUsers.filter(u => 
      u.role === 'admin' || 
      (task.employeeId && u.employeeId === task.employeeId)
    );

    for (const user of targetUsers) {
      await Notification.create({
        userId: user.id,
        type: 'overdue_work',
        title: `Просрочена работа: ${task.workName}`,
        message: `${task.equipmentName} (${task.inventoryNumber}) — просрочено на ${task.daysOverdue} дн.`,

        equipmentId: task.equipmentId,
        workId: task.workId
      });
    }
  }

  // Create notifications for upcoming works
  for (const task of upcomingTasks) {
    const targetUsers = allUsers.filter(u => 
      u.role === 'admin' || 
      (task.employeeId && u.employeeId === task.employeeId)
    );

    for (const user of targetUsers) {
      await Notification.create({
        userId: user.id,
        type: 'upcoming_work',
        title: `Предстоящая работа: ${task.workName}`,
        message: `${task.equipmentName} (${task.inventoryNumber}) — через ${task.daysUntil} дн.`,

        equipmentId: task.equipmentId,
        workId: task.workId
      });
    }
  }
}

module.exports = {
  generateWorkNotifications,
  generateForCompany
};
