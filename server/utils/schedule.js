/**
 * @module schedule
 * @description Утилиты расчёта графика планово-предупредительного обслуживания
 */

const Equipment = require('../models/equipment');
const Work = require('../models/work');
const WorkOrder = require('../models/workOrder');
const Room = require('../models/room');
const Employee = require('../models/employee');

/**
 * Загружает все виды работ и возвращает их в виде объекта,
 * ключом которого является id работы
 * @returns {Promise<Record<string, import('../models/work')>>} Словарь работ по ID
 */
async function getWorkMap(companyId) {
  const allWorks = await Work.findAll(companyId);
  const map = {};
  allWorks.forEach(w => { map[w.id] = w; });
  return map;
}

/**
 * Рассчитывает график плановых работ для конкретного элемента оборудования
 * на основе истории нарядов-заказов и периодичности работ
 * @param {object} equipment - Объект оборудования с полем workIds
 * @param {Record<string, object>} workMap - Словарь работ по ID (из getWorkMap)
 * @returns {Promise<Array<{workId: string, workName: string, description: string,
 *   frequencyDays: number, category: string, lastCompleted: string|null,
 *   nextDue: string|null, isOverdue: boolean}>>} Список задач с датами
 */
async function getEquipmentSchedule(equipment, workMap, companyId) {
  const workOrders = await WorkOrder.findByEquipmentId(equipment.id, companyId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let workIds = equipment.workIds || [];
  if (!Array.isArray(workIds)) workIds = [];

  const tasks = [];

  workIds.forEach(wid => {
    const work = workMap[wid];
    if (!work) return;

    const completedOrders = workOrders
      .filter(wo => wo.task_id === wid && wo.status === 'completed' && wo.completed_at)
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));

    const lastCompleted = completedOrders.length > 0 ? new Date(completedOrders[0].completed_at) : null;

    let nextDue = null;
    if (lastCompleted) {
      nextDue = new Date(lastCompleted);
      nextDue.setDate(nextDue.getDate() + (work.frequency_days || 30));
      nextDue.setHours(0, 0, 0, 0);
    }

    const isOverdue = nextDue ? today >= nextDue : true;

    tasks.push({
      workId: work.id,
      workName: work.name,
      description: work.description,
      frequencyDays: work.frequency_days,
      category: work.category,
      lastCompleted: lastCompleted ? lastCompleted.toISOString() : null,
      nextDue: nextDue ? nextDue.toISOString() : null,
      isOverdue,
    });
  });

  return tasks;
}

/**
 * Формирует события календаря планового обслуживания за указанный месяц,
 * объединяя данные по оборудованию, работам, помещениям и сотрудникам
 * @param {number} year - Год (например, 2026)
 * @param {number} month - Месяц (0–11, как в Date)
 * @returns {Promise<Record<string, Array<{equipmentId: string,
 *   equipmentName: string, inventoryNumber: string, workId: string,
 *   workName: string, frequencyDays: number, isOverdue: boolean,
 *   lastCompleted: string|null, roomName: string|null,
 *   employeeName: string|null}>>>} События, сгруппированные по дням (YYYY-MM-DD)
 */
async function getCalendarEvents(year, month, companyId) {
  const allEquipment = await Equipment.findAll(companyId);
  const workMap = await getWorkMap(companyId);
  const allRooms = await Room.findAll(companyId);
  const allEmployees = await Employee.findAll(companyId);

  const roomMap = {};
  allRooms.forEach(r => { roomMap[r.id] = r; });
  const empMap = {};
  allEmployees.forEach(e => { empMap[e.id] = e; });

  const events = {};

  for (const equip of allEquipment) {
    const tasks = await getEquipmentSchedule(equip, workMap, companyId);
    const room = equip.room_id ? roomMap[equip.room_id] : null;
    const employee = room && room.responsible_employee_id ? empMap[room.responsible_employee_id] : null;

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
        inventoryNumber: equip.inventory_number,
        workId: task.workId,
        workName: task.workName,
        frequencyDays: task.frequencyDays,
        isOverdue: task.isOverdue,
        lastCompleted: task.lastCompleted,
        roomName: room ? room.name : null,
        employeeName: employee ? `${employee.last_name} ${employee.first_name}` : null,
      });
    });
  }

  return events;
}

/**
 * Возвращает список ближайших задач по плановому обслуживанию
 * в пределах указанного горизонта планирования
 * @param {number} [daysAhead=7] - Количество дней вперёд от текущей даты
 * @returns {Promise<Array<{equipmentId: string, equipmentName: string,
 *   inventoryNumber: string, workId: string, workName: string,
 *   frequencyDays: number, nextDue: string, isOverdue: boolean,
 *   roomName: string|null, employeeId: string|null,
 *   employeeName: string|null}>>} Отсортированный список задач
 */
async function getUpcomingTasks(daysAhead = 7, companyId) {
  const allEquipment = await Equipment.findAll(companyId);
  const workMap = await getWorkMap(companyId);
  const allRooms = await Room.findAll(companyId);
  const allEmployees = await Employee.findAll(companyId);

  const roomMap = {};
  allRooms.forEach(r => { roomMap[r.id] = r; });
  const empMap = {};
  allEmployees.forEach(e => { empMap[e.id] = e; });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(limit.getDate() + daysAhead);

  const upcoming = [];

  for (const equip of allEquipment) {
    const tasks = await getEquipmentSchedule(equip, workMap, companyId);
    const room = equip.room_id ? roomMap[equip.room_id] : null;
    const employee = room && room.responsible_employee_id ? empMap[room.responsible_employee_id] : null;

    tasks.forEach(task => {
      if (!task.nextDue) return;
      const due = new Date(task.nextDue);
      if (due >= today && due <= limit) {
        upcoming.push({
          equipmentId: equip.id,
          equipmentName: equip.name,
          inventoryNumber: equip.inventory_number,
          ...task,
          roomName: room ? room.name : null,
          employeeId: employee ? employee.id : null,
          employeeName: employee ? `${employee.last_name} ${employee.first_name}` : null,
        });
      }
    });
  }

  return upcoming.sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue));
}

/**
 * Возвращает работы, которые нужно выполнить сегодня (просроченные и срок на сегодня).
 * @param {string} companyId - ID компании
 * @returns {Promise<Array>} Список задач на сегодня
 */
async function getTodayTasks(companyId) {
  const allEquipment = await Equipment.findAll(companyId);
  const workMap = await getWorkMap(companyId);
  const allWorkOrders = await WorkOrder.findAll(companyId);
  const allRooms = await Room.findAll(companyId);
  const allEmployees = await Employee.findAll(companyId);

  const roomMap = {};
  allRooms.forEach((r) => { roomMap[r.id] = r; });
  const empMap = {};
  allEmployees.forEach((e) => { empMap[e.id] = e; });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tasks = [];

  allEquipment.forEach((equip) => {
    const room = equip.roomId ? roomMap[equip.roomId] : null;
    const employee = room && room.responsibleEmployeeId ? empMap[room.responsibleEmployeeId] : null;

    let workIds = equip.workIds || [];
    if (!Array.isArray(workIds)) workIds = [];

    const equipOrders = allWorkOrders.filter((wo) => wo.equipmentId === equip.id);

    workIds.forEach((wid) => {
      const work = workMap[wid];
      if (!work) return;

      const completedOrders = equipOrders
        .filter((wo) => wo.taskId === wid && wo.status === 'completed' && wo.completedAt)
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

      const lastCompleted = completedOrders.length > 0 ? new Date(completedOrders[0].completedAt) : null;

      let nextDue = null;
      if (lastCompleted) {
        nextDue = new Date(lastCompleted);
        nextDue.setDate(nextDue.getDate() + (work.frequencyDays || 30));
        nextDue.setHours(0, 0, 0, 0);
      }

      const isOverdue = nextDue ? today >= nextDue : true;
      if (!isOverdue) return;

      const isDueToday = !nextDue || today.getTime() === nextDue.getTime();
      const daysOverdue = nextDue && today > nextDue
        ? Math.floor((today - nextDue) / 86400000)
        : 0;

      let status = 'today';
      if (!lastCompleted) status = 'never';
      else if (!isDueToday) status = 'overdue';

      tasks.push({
        id: `${equip.id}-${wid}`,
        equipmentId: equip.id,
        qrCode: equip.qrCode,
        equipmentName: equip.name,
        inventoryNumber: equip.inventoryNumber,
        roomName: room ? room.name : null,
        employeeName: employee ? `${employee.lastName} ${employee.firstName}` : null,
        workId: work.id,
        workName: work.name,
        frequencyDays: work.frequencyDays,
        lastCompleted: lastCompleted ? lastCompleted.toISOString() : null,
        nextDue: nextDue ? nextDue.toISOString() : null,
        isDueToday,
        daysOverdue,
        status,
      });
    });
  });

  return tasks.sort((a, b) => {
    if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue;
    const nameCmp = a.equipmentName.localeCompare(b.equipmentName, 'ru');
    if (nameCmp !== 0) return nameCmp;
    return a.workName.localeCompare(b.workName, 'ru');
  });
}

module.exports = { getWorkMap, getEquipmentSchedule, getCalendarEvents, getUpcomingTasks, getTodayTasks };
