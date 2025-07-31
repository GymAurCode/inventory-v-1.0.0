const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUser, findUserById, addUser, updateUser, deleteUser, getAllUsers } = require('../db/init');
const { JWT_SECRET } = require('../middleware/auth');

class AuthController {
  /**
   * Authenticate user and generate JWT token
   */
  static async login(req, res) {
    try {
      const { username, password } = req.body;
      
      // Validation
      if (!username || !password) {
        return res.status(400).json({ 
          error: 'Username and password are required' 
        });
      }

      const user = findUser(username);

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * Register new user (Owner only)
   */
  static async register(req, res) {
    try {
      const { username, password, role } = req.body;
      
      // Validation
      if (!username || !password || !role) {
        return res.status(400).json({ 
          error: 'Username, password, and role are required' 
        });
      }

      if (role !== 'owner' && role !== 'staff') {
        return res.status(400).json({ 
          error: 'Role must be either owner or staff' 
        });
      }

      // Check if username already exists
      const existingUser = findUser(username);
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Add new user
      const newUser = addUser({
        username,
        password: hashedPassword,
        role
      });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  /**
   * Get current user information
   */
  static async getCurrentUser(req, res) {
    try {
      res.json({
        user: {
          id: req.user.id,
          username: req.user.username,
          role: req.user.role
        }
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ error: 'Failed to get user information' });
    }
  }

  /**
   * Get all users (Owner only)
   */
  static async getAllUsers(req, res) {
    try {
      const users = getAllUsers();
      res.json({ users });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  /**
   * Delete user (Owner only)
   */
  static async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Prevent deleting self
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({ 
          error: 'Cannot delete your own account' 
        });
      }

      const deletedUser = deleteUser(id);
      
      if (!deletedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  /**
   * Update user password
   */
  static async updatePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          error: 'Current password and new password are required' 
        });
      }

      const user = findUserById(req.user.id);

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      updateUser(req.user.id, { password: hashedPassword });

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({ error: 'Failed to update password' });
    }
  }
}

module.exports = AuthController; 