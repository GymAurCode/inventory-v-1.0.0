const { getDatabase } = require('../db/init');

class Income {
  constructor(data = {}) {
    this.id = data.id;
    this.description = data.description;
    this.amount = data.amount;
    this.type = data.type;
    this.product_id = data.product_id;
    this.product_name = data.product_name;
    this.created_at = data.created_at;
  }

  /**
   * Create a new income entry
   */
  static async create(incomeData) {
    try {
      const { description, amount, type, product_id } = incomeData;
      
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
        INSERT INTO income (description, amount, type, product_id) 
        VALUES (?, ?, ?, ?)
      `).run(description, amount, type, product_id || null);

      const incomeId = result.lastInsertRowid;
      const newIncome = db.prepare('SELECT * FROM income WHERE id = ?').get(incomeId);
      
      return new Income(newIncome);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find income by ID
   */
  static findById(id) {
    try {
      const db = getDatabase();
      const incomeData = db.prepare(`
        SELECT i.*, p.name as product_name 
        FROM income i 
        LEFT JOIN products p ON i.product_id = p.id 
        WHERE i.id = ?
      `).get(id);
      
      return incomeData ? new Income(incomeData) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all income entries with optional filtering
   */
  static findAll(filters = {}) {
    try {
      const { type, startDate, endDate, product_id } = filters;
      const db = getDatabase();
      
      let query = `
        SELECT i.*, p.name as product_name 
        FROM income i 
        LEFT JOIN products p ON i.product_id = p.id
      `;
      const params = [];
      const conditions = [];

      // Apply filters
      if (type) {
        conditions.push('i.type = ?');
        params.push(type);
      }

      if (product_id) {
        conditions.push('i.product_id = ?');
        params.push(product_id);
      }

      if (startDate) {
        conditions.push('DATE(i.created_at) >= ?');
        params.push(startDate);
      }

      if (endDate) {
        conditions.push('DATE(i.created_at) <= ?');
        params.push(endDate);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY i.created_at DESC';

      const income = db.prepare(query).all(...params);
      return income.map(incomeData => new Income(incomeData));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update income entry
   */
  async update(updateData) {
    try {
      const { description, amount, type, product_id } = updateData;
      
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
      
      if (product_id !== undefined) {
        updateFields.push('product_id = ?');
        values.push(product_id);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      values.push(this.id);

      const result = db.prepare(`
        UPDATE income 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `).run(...values);

      if (result.changes === 0) {
        throw new Error('Income entry not found');
      }

      // Update local instance
      Object.assign(this, updateData);
      
      return this;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete income entry
   */
  async delete() {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM income WHERE id = ?').run(this.id);
      
      if (result.changes === 0) {
        throw new Error('Income entry not found');
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get income statistics
   */
  static getStats(filters = {}) {
    try {
      const { startDate, endDate, period = 'monthly' } = filters;
      const db = getDatabase();
      
      let dateFormat = '%Y-%m';
      let groupBy = 'strftime(?, created_at)';
      
      switch (period) {
        case 'quarterly':
          dateFormat = '%Y-Q%m';
          groupBy = 'strftime(?, created_at)';
          break;
        case 'yearly':
          dateFormat = '%Y';
          groupBy = 'strftime(?, created_at)';
          break;
        default:
          dateFormat = '%Y-%m';
          groupBy = 'strftime(?, created_at)';
      }

      // Income by period
      const incomeByPeriod = db.prepare(`
        SELECT ${groupBy} as period, SUM(amount) as total, COUNT(*) as count
        FROM income 
        GROUP BY ${groupBy} 
        ORDER BY period DESC
        LIMIT 12
      `).all(dateFormat);

      // Income by type
      const incomeByType = db.prepare(`
        SELECT type, SUM(amount) as total, COUNT(*) as count
        FROM income 
        GROUP BY type
      `).all();

      // Top income sources
      const topIncomeSources = db.prepare(`
        SELECT i.*, p.name as product_name
        FROM income i
        LEFT JOIN products p ON i.product_id = p.id
        ORDER BY i.amount DESC
        LIMIT 10
      `).all();

      // Total income
      let totalQuery = 'SELECT SUM(amount) as total FROM income';
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
        totalQuery += ' WHERE ' + conditions.join(' AND ');
      }

      const total = db.prepare(totalQuery).get(...params);

      return {
        total: total.total || 0,
        incomeByPeriod,
        incomeByType,
        topIncomeSources: topIncomeSources.map(income => new Income(income))
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get income by product
   */
  static getByProduct(productId) {
    try {
      const db = getDatabase();
      const income = db.prepare(`
        SELECT i.*, p.name as product_name 
        FROM income i 
        LEFT JOIN products p ON i.product_id = p.id 
        WHERE i.product_id = ?
        ORDER BY i.created_at DESC
      `).all(productId);
      
      return income.map(incomeData => new Income(incomeData));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if income is manual
   */
  isManual() {
    return this.type === 'manual';
  }

  /**
   * Check if income is automatic
   */
  isAuto() {
    return this.type === 'auto';
  }

  /**
   * Get income data for API response
   */
  toJSON() {
    return {
      id: this.id,
      description: this.description,
      amount: this.amount,
      type: this.type,
      product_id: this.product_id,
      product_name: this.product_name,
      created_at: this.created_at,
      is_manual: this.isManual(),
      is_auto: this.isAuto()
    };
  }
}

module.exports = Income; 