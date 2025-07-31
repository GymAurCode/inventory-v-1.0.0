const { getDatabase } = require('../db/init');

class Expense {
  constructor(data = {}) {
    this.id = data.id;
    this.description = data.description;
    this.amount = data.amount;
    this.type = data.type;
    this.category = data.category;
    this.product_id = data.product_id;
    this.product_name = data.product_name;
    this.created_at = data.created_at;
  }

  /**
   * Create a new expense
   */
  static async create(expenseData) {
    try {
      const { description, amount, type, category, product_id } = expenseData;
      
      // Validation
      if (!description || !amount || !type) {
        throw new Error('Description, amount, and type are required');
      }

      if (type !== 'manual' && type !== 'auto') {
        throw new Error('Type must be either manual or auto');
      }

      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      if (description.trim().length === 0) {
        throw new Error('Description cannot be empty');
      }

      const db = getDatabase();
      
      // Validate product_id if provided
      if (product_id) {
        const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
        if (!product) {
          throw new Error('Invalid product ID');
        }
      }

      const result = db.prepare(`
        INSERT INTO expenses (description, amount, type, category, product_id) 
        VALUES (?, ?, ?, ?, ?)
      `).run(description, amount, type, category || null, product_id || null);

      const expenseId = result.lastInsertRowid;
      const newExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
      
      return new Expense(newExpense);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find expense by ID
   */
  static findById(id) {
    try {
      const db = getDatabase();
      const expenseData = db.prepare(`
        SELECT e.*, p.name as product_name 
        FROM expenses e 
        LEFT JOIN products p ON e.product_id = p.id 
        WHERE e.id = ?
      `).get(id);
      
      return expenseData ? new Expense(expenseData) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all expenses with optional filtering
   */
  static findAll(filters = {}) {
    try {
      const { type, category, startDate, endDate, product_id } = filters;
      const db = getDatabase();
      
      let query = `
        SELECT e.*, p.name as product_name 
        FROM expenses e 
        LEFT JOIN products p ON e.product_id = p.id
      `;
      const params = [];
      const conditions = [];

      // Apply filters
      if (type) {
        conditions.push('e.type = ?');
        params.push(type);
      }

      if (category) {
        conditions.push('e.category = ?');
        params.push(category);
      }

      if (product_id) {
        conditions.push('e.product_id = ?');
        params.push(product_id);
      }

      if (startDate) {
        conditions.push('DATE(e.created_at) >= ?');
        params.push(startDate);
      }

      if (endDate) {
        conditions.push('DATE(e.created_at) <= ?');
        params.push(endDate);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY e.created_at DESC';

      const expenses = db.prepare(query).all(...params);
      return expenses.map(expenseData => new Expense(expenseData));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update expense
   */
  async update(updateData) {
    try {
      const { description, amount, type, category, product_id } = updateData;
      
      // Validation
      if (description !== undefined && description.trim().length === 0) {
        throw new Error('Description cannot be empty');
      }
      
      if (amount !== undefined && amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      if (type !== undefined && type !== 'manual' && type !== 'auto') {
        throw new Error('Type must be either manual or auto');
      }

      const db = getDatabase();
      
      // Validate product_id if provided
      if (product_id !== undefined) {
        if (product_id) {
          const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
          if (!product) {
            throw new Error('Invalid product ID');
          }
        }
      }

      // Prepare update values
      const updateFields = [];
      const values = [];
      
      if (description !== undefined) {
        updateFields.push('description = ?');
        values.push(description);
      }
      
      if (amount !== undefined) {
        updateFields.push('amount = ?');
        values.push(amount);
      }
      
      if (type !== undefined) {
        updateFields.push('type = ?');
        values.push(type);
      }
      
      if (category !== undefined) {
        updateFields.push('category = ?');
        values.push(category);
      }
      
      if (product_id !== undefined) {
        updateFields.push('product_id = ?');
        values.push(product_id);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      values.push(this.id);

      const result = db.prepare(`
        UPDATE expenses 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `).run(...values);

      if (result.changes === 0) {
        throw new Error('Expense not found');
      }

      // Update local instance
      Object.assign(this, updateData);
      
      return this;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete expense
   */
  async delete() {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(this.id);
      
      if (result.changes === 0) {
        throw new Error('Expense not found');
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get expense statistics
   */
  static getStats(filters = {}) {
    try {
      const { startDate, endDate } = filters;
      const db = getDatabase();
      
      let query = 'SELECT SUM(amount) as total FROM expenses';
      const params = [];
      const conditions = [];

      if (startDate) {
        conditions.push('DATE(created_at) >= ?');
        params.push(startDate);
      }

      if (endDate) {
        conditions.push('DATE(created_at) <= ?');
        params.push(endDate);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      const total = db.prepare(query).get(...params);
      
      // Get expenses by type
      const byType = db.prepare(`
        SELECT type, SUM(amount) as total, COUNT(*) as count
        FROM expenses
        GROUP BY type
      `).all();

      // Get expenses by category
      const byCategory = db.prepare(`
        SELECT category, SUM(amount) as total, COUNT(*) as count
        FROM expenses
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY total DESC
      `).all();

      // Get expenses by month
      const byMonth = db.prepare(`
        SELECT 
          strftime('%Y-%m', created_at) as month,
          SUM(amount) as total,
          COUNT(*) as count
        FROM expenses
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month DESC
        LIMIT 12
      `).all();

      // Get top expenses
      const topExpenses = db.prepare(`
        SELECT e.*, p.name as product_name
        FROM expenses e
        LEFT JOIN products p ON e.product_id = p.id
        ORDER BY e.amount DESC
        LIMIT 10
      `).all();

      return {
        total: total.total || 0,
        byType,
        byCategory,
        byMonth,
        topExpenses: topExpenses.map(expense => new Expense(expense))
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get expense categories
   */
  static getCategories() {
    try {
      const db = getDatabase();
      
      const categories = db.prepare(`
        SELECT DISTINCT category 
        FROM expenses 
        WHERE category IS NOT NULL 
        ORDER BY category
      `).all();

      return categories.map(c => c.category);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get expenses by product
   */
  static getByProduct(productId) {
    try {
      const db = getDatabase();
      const expenses = db.prepare(`
        SELECT e.*, p.name as product_name 
        FROM expenses e 
        LEFT JOIN products p ON e.product_id = p.id 
        WHERE e.product_id = ?
        ORDER BY e.created_at DESC
      `).all(productId);
      
      return expenses.map(expenseData => new Expense(expenseData));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if expense is manual
   */
  isManual() {
    return this.type === 'manual';
  }

  /**
   * Check if expense is automatic
   */
  isAuto() {
    return this.type === 'auto';
  }

  /**
   * Get expense data for API response
   */
  toJSON() {
    return {
      id: this.id,
      description: this.description,
      amount: this.amount,
      type: this.type,
      category: this.category,
      product_id: this.product_id,
      product_name: this.product_name,
      created_at: this.created_at,
      is_manual: this.isManual(),
      is_auto: this.isAuto()
    };
  }
}

module.exports = Expense; 