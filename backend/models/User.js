const bcrypt = require('bcryptjs');
const { getDatabase } = require('../db/init');

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.username = data.username;
    this.password = data.password;
    this.role = data.role;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Create a new user
   */
  static async create(userData) {
    try {
      const { username, password, role } = userData;
      
      // Validation
      if (!username || !password || !role) {
        throw new Error('Username, password, and role are required');
      }

      if (role !== 'owner' && role !== 'staff') {
        throw new Error('Role must be either owner or staff');
      }

      if (username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      const db = getDatabase();
      
      // Check if username already exists
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert new user
      const result = db.prepare(`
        INSERT INTO users (username, password, role) 
        VALUES (?, ?, ?)
      `).run(username, hashedPassword, role);

      return new User({
        id: result.lastInsertRowid,
        username,
        role,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static findById(id) {
    try {
      const db = getDatabase();
      const userData = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      
      return userData ? new User(userData) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find user by username
   */
  static findByUsername(username) {
    try {
      const db = getDatabase();
      const userData = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      
      return userData ? new User(userData) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all users
   */
  static findAll() {
    try {
      const db = getDatabase();
      const users = db.prepare(`
        SELECT id, username, role, created_at, updated_at 
        FROM users 
        ORDER BY created_at DESC
      `).all();
      
      return users.map(userData => new User(userData));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user
   */
  async update(updateData) {
    try {
      const db = getDatabase();
      
      const updates = [];
      const values = [];
      
      if (updateData.username !== undefined) {
        updates.push('username = ?');
        values.push(updateData.username);
      }
      
      if (updateData.role !== undefined) {
        if (updateData.role !== 'owner' && updateData.role !== 'staff') {
          throw new Error('Role must be either owner or staff');
        }
        updates.push('role = ?');
        values.push(updateData.role);
      }
      
      if (updateData.password !== undefined) {
        if (updateData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        const hashedPassword = await bcrypt.hash(updateData.password, 10);
        updates.push('password = ?');
        values.push(hashedPassword);
      }
      
      if (updates.length === 0) {
        throw new Error('No fields to update');
      }
      
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(this.id);
      
      const result = db.prepare(`
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `).run(...values);
      
      if (result.changes === 0) {
        throw new Error('User not found');
      }
      
      // Update local instance
      Object.assign(this, updateData);
      this.updated_at = new Date().toISOString();
      
      return this;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete user
   */
  async delete() {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM users WHERE id = ?').run(this.id);
      
      if (result.changes === 0) {
        throw new Error('User not found');
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify password
   */
  async verifyPassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      // Verify current password
      const isValidPassword = await this.verifyPassword(currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }
      
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const db = getDatabase();
      const result = db.prepare(`
        UPDATE users 
        SET password = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(hashedPassword, this.id);
      
      if (result.changes === 0) {
        throw new Error('Failed to update password');
      }
      
      this.password = hashedPassword;
      this.updated_at = new Date().toISOString();
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user count by role
   */
  static getCountByRole(role) {
    try {
      const db = getDatabase();
      const result = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get(role);
      return result.count;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if user is owner
   */
  isOwner() {
    return this.role === 'owner';
  }

  /**
   * Check if user is staff
   */
  isStaff() {
    return this.role === 'staff';
  }

  /**
   * Get user data for API response (without password)
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      role: this.role,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = User; 