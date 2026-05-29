const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE = path.join(__dirname, '..', 'data', 'notifications.json');

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
  return readData().find(n => n.id === id);
}

function findByUser(userId) {
  return readData().filter(n => n.userId === userId);
}

function findUnread(userId) {
  return readData().filter(n => n.userId === userId && !n.read);
}

function create(notifData) {
  const data = readData();
  const existing = data.find(n =>
    n.userId === notifData.userId &&
    n.type === notifData.type &&
    n.equipmentId === notifData.equipmentId &&
    n.workId === notifData.workId &&
    !n.read
  );
  if (existing) return existing;

  const notif = {
    id: uuidv4(),
    userId: notifData.userId,
    type: notifData.type || 'info',
    title: notifData.title || '',
    message: notifData.message || '',
    equipmentId: notifData.equipmentId || null,
    workId: notifData.workId || null,
    incidentId: notifData.incidentId || null,
    read: false,
    createdAt: new Date().toISOString()
  };
  data.unshift(notif);
  writeData(data);
  return notif;
}

function markRead(id) {
  const data = readData();
  const index = data.findIndex(n => n.id === id);
  if (index === -1) return null;
  data[index].read = true;
  data[index].readAt = new Date().toISOString();
  writeData(data);
  return data[index];
}

function markAllRead(userId) {
  const data = readData();
  data.forEach(n => {
    if (n.userId === userId && !n.read) {
      n.read = true;
      n.readAt = new Date().toISOString();
    }
  });
  writeData(data);
}

function remove(id) {
  const data = readData();
  const index = data.findIndex(n => n.id === id);
  if (index === -1) return false;
  data.splice(index, 1);
  writeData(data);
  return true;
}

module.exports = { findAll, findById, findByUser, findUnread, create, markRead, markAllRead, remove };
