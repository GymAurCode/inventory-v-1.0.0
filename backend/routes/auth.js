const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticateToken, requireOwner, checkOwnerLimit } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', AuthController.login);

// Register (Owner only)
router.post('/register', authenticateToken, requireOwner, checkOwnerLimit, AuthController.register);

// Get current user
router.get('/me', authenticateToken, AuthController.getCurrentUser);

// Get all users (Owner only)
router.get('/users', authenticateToken, requireOwner, AuthController.getAllUsers);

// Delete user (Owner only)
router.delete('/users/:id', authenticateToken, requireOwner, AuthController.deleteUser);

// Update password
router.put('/password', authenticateToken, AuthController.updatePassword);

module.exports = router; 