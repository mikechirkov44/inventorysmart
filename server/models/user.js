const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const DATA_FILE = path.join(__dirname, '..', 'data', 'users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'inventorysmart-secret-key-2026';
const JWT_EXPIRES = '24h';

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

function ensureAdmin() {
  const data = readData();
  if (data.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    data.push({
      id: uuidv4(),
      username: 'admin',
      passwordHash: hash,
      fullName: 'Администратор',
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    writeData(data);
    console.log('Default admin created: admin / admin123');
  }
}

function findAll() {
  return readData().map(({ passwordHash, ...u }) => u);
}

function findById(id) {
  const data = readData();
  const user = data.find(u => u.id === id);
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

function findByUsername(username) {
  const data = readData();
  return data.find(u => u.username === username);
}

function create(userData) {
  const data = readData();
  if (data.find(u => u.username === userData.username)) {
    return null;
  }
  const newUser = {
    id: uuidv4(),
    username: userData.username,
    passwordHash: bcrypt.hashSync(userData.password, 10),
    fullName: userData.fullName || '',
    role: userData.role || 'user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.push(newUser);
  writeData(data);
  const { passwordHash, ...rest } = newUser;
  return rest;
}

function update(id, userData) {
  const data = readData();
  const index = data.findIndex(u => u.id === id);
  if (index === -1) return null;

  if (userData.password) {
    userData.passwordHash = bcrypt.hashSync(userData.password, 10);
  }
  delete userData.password;

  data[index] = {
    ...data[index],
    ...userData,
    id: data[index].id,
    username: data[index].username,
    createdAt: data[index].createdAt,
    updatedAt: new Date().toISOString()
  };
  writeData(data);
  const { passwordHash, ...rest } = data[index];
  return rest;
}

function remove(id) {
  const data = readData();
  const index = data.findIndex(u => u.id === id);
  if (index === -1) return false;
  data.splice(index, 1);
  writeData(data);
  return true;
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES,
  ensureAdmin,
  findAll,
  findById,
  findByUsername,
  create,
  update,
  remove,
  verifyPassword
};
