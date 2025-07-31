const { getDatabase } = require('../db/init');

class Product {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.cost_price = data.cost_price;
    this.selling_price = data.selling_price;
    this.quantity = data.quantity;
    this.total_cost = data.total_cost;
    this.total_revenue = data.total_revenue;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Create a new product
   */
  static async create(productData) {
    try {
      const { name, cost_price, selling_price, quantity } = productData;
      
      // Validation
      if (!name || cost_price === undefined || selling_price === undefined || quantity === undefined) {
        throw new Error('All fields are required');
      }

      if (cost_price < 0 || selling_price < 0 || quantity < 0) {
        throw new Error('Prices and quantity must be non-negative');
      }

      if (name.trim().length === 0) {
        throw new Error('Product name cannot be empty');
      }

      const db = getDatabase();
      
      // Insert product
      const result = db.prepare(`
        INSERT INTO products (name, cost_price, selling_price, quantity) 
        VALUES (?, ?, ?, ?)
      `).run(name, cost_price, selling_price, quantity);

      const productId = result.lastInsertRowid;

      // Auto-create expense entry for cost if quantity > 0
      if (quantity > 0) {
        const totalCost = cost_price * quantity;
        db.prepare(`
          INSERT INTO expenses (description, amount, type, category, product_id) 
          VALUES (?, ?, 'auto', 'product_cost', ?)
        `).run(`Product cost for ${name}`, totalCost, productId);

        // Auto-create income entry for revenue
        const totalRevenue = selling_price * quantity;
        db.prepare(`
          INSERT INTO income (description, amount, type, product_id) 
          VALUES (?, ?, 'auto', ?)
        `).run(`Product revenue for ${name}`, totalRevenue, productId);
      }

      return new Product({
        id: productId,
        name,
        cost_price,
        selling_price,
        quantity,
        total_cost: cost_price * quantity,
        total_revenue: selling_price * quantity,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find product by ID
   */
  static findById(id) {
    try {
      const db = getDatabase();
      const productData = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      
      return productData ? new Product(productData) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find product by name
   */
  static findByName(name) {
    try {
      const db = getDatabase();
      const productData = db.prepare('SELECT * FROM products WHERE name = ?').get(name);
      
      return productData ? new Product(productData) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all products
   */
  static findAll() {
    try {
      const db = getDatabase();
      const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
      
      return products.map(productData => new Product(productData));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Search products
   */
  static search(query) {
    try {
      const db = getDatabase();
      const products = db.prepare(`
        SELECT * FROM products 
        WHERE name LIKE ? 
        ORDER BY created_at DESC
      `).all(`%${query}%`);
      
      return products.map(productData => new Product(productData));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update product
   */
  async update(updateData) {
    try {
      const { name, cost_price, selling_price, quantity } = updateData;
      
      // Validation
      if (cost_price !== undefined && cost_price < 0) {
        throw new Error('Cost price must be non-negative');
      }
      
      if (selling_price !== undefined && selling_price < 0) {
        throw new Error('Selling price must be non-negative');
      }
      
      if (quantity !== undefined && quantity < 0) {
        throw new Error('Quantity must be non-negative');
      }
      
      if (name !== undefined && name.trim().length === 0) {
        throw new Error('Product name cannot be empty');
      }

      const db = getDatabase();
      
      // Get old product data
      const oldProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(this.id);
      if (!oldProduct) {
        throw new Error('Product not found');
      }

      // Prepare update values
      const updateFields = [];
      const values = [];
      
      if (name !== undefined) {
        updateFields.push('name = ?');
        values.push(name);
      }
      
      if (cost_price !== undefined) {
        updateFields.push('cost_price = ?');
        values.push(cost_price);
      }
      
      if (selling_price !== undefined) {
        updateFields.push('selling_price = ?');
        values.push(selling_price);
      }
      
      if (quantity !== undefined) {
        updateFields.push('quantity = ?');
        values.push(quantity);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(this.id);

      // Update product
      const result = db.prepare(`
        UPDATE products 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `).run(...values);

      if (result.changes === 0) {
        throw new Error('Product not found');
      }

      // Update auto expenses and income if quantity changed
      const newQuantity = quantity !== undefined ? quantity : oldProduct.quantity;
      const newCostPrice = cost_price !== undefined ? cost_price : oldProduct.cost_price;
      const newSellingPrice = selling_price !== undefined ? selling_price : oldProduct.selling_price;
      const newName = name !== undefined ? name : oldProduct.name;
      
      const quantityDiff = newQuantity - oldProduct.quantity;
      if (quantityDiff !== 0) {
        // Update expense
        const costDiff = newCostPrice * quantityDiff;
        if (costDiff > 0) {
          db.prepare(`
            INSERT INTO expenses (description, amount, type, category, product_id) 
            VALUES (?, ?, 'auto', 'product_cost', ?)
          `).run(`Quantity update cost for ${newName}`, costDiff, this.id);
        }

        // Update income
        const revenueDiff = newSellingPrice * quantityDiff;
        if (revenueDiff > 0) {
          db.prepare(`
            INSERT INTO income (description, amount, type, product_id) 
            VALUES (?, ?, 'auto', ?)
          `).run(`Quantity update revenue for ${newName}`, revenueDiff, this.id);
        }
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
   * Delete product
   */
  async delete() {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM products WHERE id = ?').run(this.id);
      
      if (result.changes === 0) {
        throw new Error('Product not found');
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  static getLowStock(threshold = 10) {
    try {
      const db = getDatabase();
      const products = db.prepare(`
        SELECT * FROM products 
        WHERE quantity < ? 
        ORDER BY quantity ASC
      `).all(threshold);
      
      return products.map(productData => new Product(productData));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get top products by revenue
   */
  static getTopByRevenue(limit = 5) {
    try {
      const db = getDatabase();
      const products = db.prepare(`
        SELECT * FROM products 
        ORDER BY total_revenue DESC 
        LIMIT ?
      `).all(limit);
      
      return products.map(productData => new Product(productData));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  static getStats() {
    try {
      const db = getDatabase();
      
      // Total products
      const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
      
      // Total inventory value
      const inventoryValue = db.prepare(`
        SELECT SUM(total_cost) as total_cost, SUM(total_revenue) as total_revenue 
        FROM products
      `).get();
      
      // Low stock count
      const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE quantity < 10').get();
      
      // Average profit margin
      const avgProfitMargin = db.prepare(`
        SELECT AVG(((selling_price - cost_price) / cost_price) * 100) as avg_margin 
        FROM products 
        WHERE cost_price > 0
      `).get();
      
      return {
        totalProducts: totalProducts.count,
        inventoryValue: {
          totalCost: inventoryValue.total_cost || 0,
          totalRevenue: inventoryValue.total_revenue || 0
        },
        lowStockCount: lowStockCount.count,
        avgProfitMargin: avgProfitMargin.avg_margin || 0
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate profit margin
   */
  getProfitMargin() {
    if (this.cost_price <= 0) return 0;
    return ((this.selling_price - this.cost_price) / this.cost_price) * 100;
  }

  /**
   * Check if product is low stock
   */
  isLowStock(threshold = 10) {
    return this.quantity < threshold;
  }

  /**
   * Get product data for API response
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      cost_price: this.cost_price,
      selling_price: this.selling_price,
      quantity: this.quantity,
      total_cost: this.total_cost,
      total_revenue: this.total_revenue,
      profit_margin: this.getProfitMargin(),
      is_low_stock: this.isLowStock(),
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Product; 