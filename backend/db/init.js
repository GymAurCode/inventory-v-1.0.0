const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let dbPath;
let db = {
  users: [],
  products: [],
  expenses: [],
  income: [],
  partners: []
};

function initializeDatabase(dbFilePath) {
  dbPath = dbFilePath;
  
  try {
    // Create database directory if it doesn't exist
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      db = JSON.parse(data);
    } else {
      // Initialize with default data
      initializeDefaultData();
      saveDatabase();
    }

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

function initializeDefaultData() {
  // Create default owner accounts
  const defaultOwners = [
    {
      id: 1,
      username: 'owner1',
      password: bcrypt.hashSync('owner123', 10),
      role: 'owner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      username: 'owner2',
      password: bcrypt.hashSync('owner123', 10),
      role: 'owner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  db.users = defaultOwners;
  console.log('Default owner accounts created');
}

function saveDatabase() {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  } catch (error) {
    console.error('Error saving database:', error);
  }
}

function getDatabase() {
  return {
    ...db,
    save: saveDatabase
  };
}

// Helper functions for database operations
function findUser(username) {
  return db.users.find(user => user.username === username);
}

function findUserById(id) {
  return db.users.find(user => user.id === parseInt(id));
}

function addUser(userData) {
  const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
  const newUser = {
    id: newId,
    ...userData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.users.push(newUser);
  saveDatabase();
  return newUser;
}

function updateUser(id, userData) {
  const userIndex = db.users.findIndex(user => user.id === parseInt(id));
  if (userIndex !== -1) {
    db.users[userIndex] = {
      ...db.users[userIndex],
      ...userData,
      updated_at: new Date().toISOString()
    };
    saveDatabase();
    return db.users[userIndex];
  }
  return null;
}

function deleteUser(id) {
  const userIndex = db.users.findIndex(user => user.id === parseInt(id));
  if (userIndex !== -1) {
    const deletedUser = db.users.splice(userIndex, 1)[0];
    saveDatabase();
    return deletedUser;
  }
  return null;
}

function getAllUsers() {
  return db.users.map(user => ({
    id: user.id,
    username: user.username,
    role: user.role,
    created_at: user.created_at
  }));
}

module.exports = {
  initializeDatabase,
  getDatabase,
  findUser,
  findUserById,
  addUser,
  updateUser,
  deleteUser,
  getAllUsers
}; 