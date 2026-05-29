const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'work-orders.json');

function readData() {
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(data);
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function findAll() {
  return readData();
}

function findById(id) {
  const data = readData();
  return data.find(item => item.id === id);
}

function findByEquipmentId(equipmentId) {
  const data = readData();
  return data.filter(item => item.equipmentId === equipmentId);
}

function create(workOrderData) {
  const data = readData();
  const newWorkOrder = {
    id: uuidv4(),
    equipmentId: workOrderData.equipmentId,
    taskId: workOrderData.taskId,
    taskName: workOrderData.taskName || '',
    status: 'pending',
    masterName: workOrderData.masterName || '',
    notes: workOrderData.notes || '',
    photos: [],
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.push(newWorkOrder);
  writeData(data);
  return newWorkOrder;
}

function update(id, workOrderData) {
  const data = readData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return null;
  
  if (workOrderData.status === 'completed') {
    workOrderData.completedAt = new Date().toISOString();
  }
  
  data[index] = {
    ...data[index],
    ...workOrderData,
    id: data[index].id,
    createdAt: data[index].createdAt,
    updatedAt: new Date().toISOString()
  };
  writeData(data);
  return data[index];
}

function remove(id) {
  const data = readData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return false;
  
  data.splice(index, 1);
  writeData(data);
  return true;
}

function createMany(workOrdersArray) {
  const data = readData();
  const newItems = workOrdersArray.map(item => ({
    id: uuidv4(),
    equipmentId: item.equipmentId,
    taskId: item.taskId,
    taskName: item.taskName || '',
    status: 'pending',
    masterName: item.masterName || '',
    notes: item.notes || '',
    photos: [],
    completedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  data.push(...newItems);
  writeData(data);
  return newItems;
}

module.exports = {
  findAll,
  findById,
  findByEquipmentId,
  create,
  update,
  remove,
  createMany
};
