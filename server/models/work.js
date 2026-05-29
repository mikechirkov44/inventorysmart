const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'works.json');

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

function create(workData) {
  const data = readData();
  const newWork = {
    id: uuidv4(),
    name: workData.name,
    description: workData.description || '',
    frequencyDays: parseInt(workData.frequencyDays) || 30,
    category: workData.category || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.push(newWork);
  writeData(data);
  return newWork;
}

function update(id, workData) {
  const data = readData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return null;

  data[index] = {
    ...data[index],
    ...workData,
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

function createMany(worksArray) {
  const data = readData();
  const newItems = worksArray.map(item => ({
    id: uuidv4(),
    name: item.name || '',
    description: item.description || '',
    frequencyDays: parseInt(item.frequencyDays) || 30,
    category: item.category || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));
  data.push(...newItems);
  writeData(data);
  return newItems;
}

module.exports = { findAll, findById, create, update, remove, createMany };
