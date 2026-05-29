const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'equipment.json');

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

function findByQrCode(qrCode) {
  const data = readData();
  return data.find(item => item.qrCode === qrCode);
}

function create(equipmentData) {
  const data = readData();

  let workIds = equipmentData.workIds || [];
  if (typeof workIds === 'string') {
    try { workIds = JSON.parse(workIds); } catch (_) { workIds = []; }
  }
  if (!Array.isArray(workIds)) workIds = [];

  const newEquipment = {
    id: uuidv4(),
    qrCode: uuidv4(),
    name: equipmentData.name,
    inventoryNumber: equipmentData.inventoryNumber || '',
    description: equipmentData.description || '',
    photo: equipmentData.photo || null,
    roomId: equipmentData.roomId || '',
    category: equipmentData.category || '',
    status: equipmentData.status || 'working',
    workIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.push(newEquipment);
  writeData(data);
  return newEquipment;
}

function update(id, equipmentData) {
  const data = readData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return null;

  data[index] = {
    ...data[index],
    ...equipmentData,
    id: data[index].id,
    qrCode: data[index].qrCode,
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

  const equipment = data[index];
  if (equipment.photo) {
    const photoPath = path.join(__dirname, '..', 'uploads', equipment.photo);
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }
  }

  data.splice(index, 1);
  writeData(data);
  return true;
}

function createMany(equipmentArray) {
  const data = readData();
  const newItems = equipmentArray.map(item => ({
    id: uuidv4(),
    qrCode: uuidv4(),
    name: item.name || '',
    inventoryNumber: item.inventoryNumber || '',
    description: item.description || '',
    photo: item.photo || null,
    roomId: item.roomId || '',
    category: item.category || '',
    status: item.status || 'working',
    workIds: item.workIds || [],
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
  findByQrCode,
  create,
  update,
  remove,
  createMany
};
