const jwt = require('jsonwebtoken');
const { getAllUsers } = require('../db/init');

const JWT_SECRET = process.env.JWT_SECRET || 'eyercall-secret-key-2024';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }

  next();
};

const requireStaffOrOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'staff' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Staff or owner access required' });
  }

  next();
};

const checkOwnerLimit = (req, res, next) => {
  const users = getAllUsers();
  const ownerCount = users.filter(user => user.role === 'owner').length;
  
  if (ownerCount >= 2) {
    return res.status(400).json({ error: 'Maximum number of owners (2) already reached' });
  }
  
  next();
};

module.exports = {
  authenticateToken,
  requireOwner,
  requireStaffOrOwner,
  checkOwnerLimit,
  JWT_SECRET
}; 