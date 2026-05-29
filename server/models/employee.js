const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'employees.json');

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

function create(employeeData) {
  const data = readData();
  const newEmployee = {
    id: uuidv4(),
    firstName: employeeData.firstName || '',
    lastName: employeeData.lastName || '',
    middleName: employeeData.middleName || '',
    position: employeeData.position || '',
    phone: employeeData.phone || '',
    email: employeeData.email || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.push(newEmployee);
  writeData(data);
  return newEmployee;
}

function update(id, employeeData) {
  const data = readData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return null;

  data[index] = {
    ...data[index],
    ...employeeData,
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

module.exports = { findAll, findById, create, update, remove };
