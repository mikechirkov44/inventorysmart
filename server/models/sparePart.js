const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'spareParts.json');

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    return [];
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function findAll() { return readData(); }

function findById(id) {
  return readData().find(s => s.id === id);
}

function create(spData) {
  const data = readData();
  let equipmentIds = spData.equipmentIds || [];
  let workIds = spData.workIds || [];
  if (typeof equipmentIds === 'string') { try { equipmentIds = JSON.parse(equipmentIds); } catch (_) { equipmentIds = []; } }
  if (typeof workIds === 'string') { try { workIds = JSON.parse(workIds); } catch (_) { workIds = []; } }

  const item = {
    id: uuidv4(),
    name: spData.name || '',
    article: spData.article || '',
    manufacturer: spData.manufacturer || '',
    minStock: parseInt(spData.minStock) || 0,
    equipmentIds,
    workIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.push(item);
  writeData(data);
  return item;
}

function update(id, spData) {
  const data = readData();
  const index = data.findIndex(s => s.id === id);
  if (index === -1) return null;

  if (spData.equipmentIds !== undefined) {
    let ids = spData.equipmentIds;
    if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch (_) { ids = []; } }
    spData.equipmentIds = ids;
  }
  if (spData.workIds !== undefined) {
    let ids = spData.workIds;
    if (typeof ids === 'string') { try { ids = JSON.parse(ids); } catch (_) { ids = []; } }
    spData.workIds = ids;
  }
  if (spData.minStock !== undefined) {
    spData.minStock = parseInt(spData.minStock) || 0;
  }

  data[index] = {
    ...data[index],
    ...spData,
    id: data[index].id,
    createdAt: data[index].createdAt,
    updatedAt: new Date().toISOString()
  };
  writeData(data);
  return data[index];
}

function remove(id) {
  const data = readData();
  const index = data.findIndex(s => s.id === id);
  if (index === -1) return false;
  data.splice(index, 1);
  writeData(data);
  return true;
}

module.exports = { findAll, findById, create, update, remove };
