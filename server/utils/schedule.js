const Equipment = require('../models/equipment');
const Work = require('../models/work');
const WorkOrder = require('../models/workOrder');
const Room = require('../models/room');
const Employee = require('../models/employee');

function getWorkMap() {
  const allWorks = Work.findAll();
  const map = {};
  allWorks.forEach(w => { map[w.id] = w; });
  return map;
}

function getEquipmentSchedule(equipment, workMap) {
  const workOrders = WorkOrder.findByEquipmentId(equipment.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let workIds = equipment.workIds || [];
  if (typeof workIds === 'string') {
    try { workIds = JSON.parse(workIds); } catch (_) { workIds = []; }
  }
  if (!Array.isArray(workIds)) workIds = [];

  const tasks = [];

  workIds.forEach(wid => {
    const work = workMap[wid];
    if (!work) return;

    const completedOrders = workOrders
      .filter(wo => wo.taskId === wid && wo.status === 'completed' && wo.completedAt)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    const lastCompleted = completedOrders.length > 0 ? new Date(completedOrders[0].completedAt) : null;

    let nextDue = null;
    if (lastCompleted) {
      nextDue = new Date(lastCompleted);
      nextDue.setDate(nextDue.getDate() + (work.frequencyDays || 30));
      nextDue.setHours(0, 0, 0, 0);
    }

    const isOverdue = nextDue ? today >= nextDue : true;

    tasks.push({
      workId: work.id,
      workName: work.name,
      description: work.description,
      frequencyDays: work.frequencyDays,
      category: work.category,
      lastCompleted: lastCompleted ? lastCompleted.toISOString() : null,
      nextDue: nextDue ? nextDue.toISOString() : null,
      isOverdue,
    });
  });

  return tasks;
}

function getCalendarEvents(year, month) {
  const allEquipment = Equipment.findAll();
  const workMap = getWorkMap();
  const allRooms = Room.findAll();
  const allEmployees = Employee.findAll();

  const roomMap = {};
  allRooms.forEach(r => { roomMap[r.id] = r; });
  const empMap = {};
  allEmployees.forEach(e => { empMap[e.id] = e; });

  const events = {};

  allEquipment.forEach(equip => {
    const tasks = getEquipmentSchedule(equip, workMap);
    const room = equip.roomId ? roomMap[equip.roomId] : null;
    const employee = room && room.responsibleEmployeeId ? empMap[room.responsibleEmployeeId] : null;

    tasks.forEach(task => {
      if (!task.nextDue) return;
      const due = new Date(task.nextDue);
      if (due.getFullYear() !== year || due.getMonth() !== month) return;

      const day = due.getDate();
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      if (!events[key]) events[key] = [];
      events[key].push({
        equipmentId: equip.id,
        equipmentName: equip.name,
        inventoryNumber: equip.inventoryNumber,
        workId: task.workId,
        workName: task.workName,
        frequencyDays: task.frequencyDays,
        isOverdue: task.isOverdue,
        lastCompleted: task.lastCompleted,
        roomName: room ? room.name : null,
        employeeName: employee ? `${employee.lastName} ${employee.firstName}` : null,
      });
    });
  });

  return events;
}

function getUpcomingTasks(daysAhead = 7) {
  const allEquipment = Equipment.findAll();
  const workMap = getWorkMap();
  const allRooms = Room.findAll();
  const allEmployees = Employee.findAll();

  const roomMap = {};
  allRooms.forEach(r => { roomMap[r.id] = r; });
  const empMap = {};
  allEmployees.forEach(e => { empMap[e.id] = e; });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + daysAhead);

  const upcoming = [];

  allEquipment.forEach(equip => {
    const tasks = getEquipmentSchedule(equip, workMap);
    const room = equip.roomId ? roomMap[equip.roomId] : null;
    const employee = room && room.responsibleEmployeeId ? empMap[room.responsibleEmployeeId] : null;

    tasks.forEach(task => {
      if (!task.nextDue) return;
      const due = new Date(task.nextDue);
      if (due >= today && due <= limit) {
        upcoming.push({
          equipmentId: equip.id,
          equipmentName: equip.name,
          inventoryNumber: equip.inventoryNumber,
          ...task,
          roomName: room ? room.name : null,
          employeeId: employee ? employee.id : null,
          employeeName: employee ? `${employee.lastName} ${employee.firstName}` : null,
        });
      }
    });
  });

  return upcoming.sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue));
}

module.exports = { getWorkMap, getEquipmentSchedule, getCalendarEvents, getUpcomingTasks };
