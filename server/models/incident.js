const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'incidents.json');

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
  return readData().find(i => i.id === id);
}

function findByEquipmentId(equipmentId) {
  return readData().filter(i => i.equipmentId === equipmentId);
}

function create(incidentData) {
  const data = readData();
  const incident = {
    id: uuidv4(),
    equipmentId: incidentData.equipmentId,
    employeeId: incidentData.employeeId || null,
    employeeName: incidentData.employeeName || '',
    description: incidentData.description || '',
    photos: incidentData.photos || [],
    status: 'new',
    adminNotes: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.unshift(incident);
  writeData(data);
  return incident;
}

function update(id, updateData) {
  const data = readData();
  const index = data.findIndex(i => i.id === id);
  if (index === -1) return null;
  data[index] = {
    ...data[index],
    ...updateData,
    id: data[index].id,
    createdAt: data[index].createdAt,
    updatedAt: new Date().toISOString()
  };
  writeData(data);
  return data[index];
}

function remove(id) {
  const data = readData();
  const index = data.findIndex(i => i.id === id);
  if (index === -1) return false;

  const incident = data[index];
  if (incident.photos && incident.photos.length > 0) {
    incident.photos.forEach(photo => {
      const photoPath = path.join(__dirname, '..', 'uploads', photo);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    });
  }

  data.splice(index, 1);
  writeData(data);
  return true;
}

module.exports = { findAll, findById, findByEquipmentId, create, update, remove };
