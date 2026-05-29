const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'rooms.json');

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    return [];
  }
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

function create(roomData) {
  const data = readData();
  const newRoom = {
    id: uuidv4(),
    name: roomData.name,
    description: roomData.description || '',
    building: roomData.building || '',
    floor: roomData.floor || '',
    responsibleEmployeeId: roomData.responsibleEmployeeId || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.push(newRoom);
  writeData(data);
  return newRoom;
}

function update(id, roomData) {
  const data = readData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return null;

  data[index] = {
    ...data[index],
    ...roomData,
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

function createMany(roomsArray) {
  const data = readData();
  const newItems = roomsArray.map(item => ({
    id: uuidv4(),
    name: item.name || '',
    description: item.description || '',
    building: item.building || '',
    floor: item.floor || '',
    responsibleEmployeeId: item.responsibleEmployeeId || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  data.push(...newItems);
  writeData(data);
  return newItems;
}

module.exports = { findAll, findById, create, update, remove, createMany };
