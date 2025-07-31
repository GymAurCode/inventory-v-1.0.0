const dbService = require('../config/initDb');

const PDFDocument = require('pdfkit');
const Excel = require('exceljs');
const moment = require('moment');

class ProductController {
  /**
   * Export products to PDF
   */
  static async exportToPDF(req, res) {
    try {
      const db = dbService.getDatabase();
      const products = db.prepare('SELECT * FROM products ORDER BY name').all();
      
      // Create PDF document
      const doc = new PDFDocument();
      const filename = `products_export_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Add content to PDF
      doc.fontSize(20).text('Products Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      
      // Add table headers
      const tableTop = 150;
      doc.text('Name', 50, tableTop);
      doc.text('Cost Price', 200, tableTop);
      doc.text('Selling Price', 300, tableTop);
      doc.text('Quantity', 400, tableTop);
      doc.text('Created At', 500, tableTop);
      
      let yPosition = tableTop + 30;
      
      // Add table rows
      products.forEach((product) => {
        if (yPosition > 700) { // Start new page if near bottom
          doc.addPage();
          yPosition = 50;
        }
        
        doc.text(product.name, 50, yPosition);
        doc.text(product.cost_price.toString(), 200, yPosition);
        doc.text(product.selling_price.toString(), 300, yPosition);
        doc.text(product.quantity.toString(), 400, yPosition);
        doc.text(moment(product.created_at).format('YYYY-MM-DD'), 500, yPosition);
        
        yPosition += 30;
      });
      
      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error('Export to PDF error:', error);
      res.status(500).json({ error: 'Failed to export products to PDF' });
    }
  }
  
  /**
   * Export products to Excel
   */
  static async exportToExcel(req, res) {
    try {
      const db = dbService.getDatabase();
      const products = db.prepare('SELECT * FROM products ORDER BY name').all();
      
      // Create Excel workbook and worksheet
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Products');
      
      // Set up columns
      worksheet.columns = [
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Cost Price', key: 'cost_price', width: 15 },
        { header: 'Selling Price', key: 'selling_price', width: 15 },
        { header: 'Quantity', key: 'quantity', width: 15 },
        { header: 'Created At', key: 'created_at', width: 20 }
      ];
      
      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      
      // Add data rows
      products.forEach(product => {
        worksheet.addRow({
          name: product.name,
          cost_price: product.cost_price,
          selling_price: product.selling_price,
          quantity: product.quantity,
          created_at: moment(product.created_at).format('YYYY-MM-DD')
        });
      });
      
      // Set filename and headers
      const filename = `products_export_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export to Excel error:', error);
      res.status(500).json({ error: 'Failed to export products to Excel' });
    }
  }
  /**
   * Get all products
   */
  static async getAllProducts(req, res) {
    try {
      const db = dbService.getDatabase();
      const products = db.prepare(`
        SELECT * FROM products 
        ORDER BY created_at DESC
      `).all();

      res.json({ products });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  /**
   * Get single product by ID
   */
  static async getProductById(req, res) {
    try {
      const { id } = req.params;
      const db = dbService.getDatabase();
      
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ product });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  /**
   * Create new product with automatic expense and income tracking
   */
  static async createProduct(req, res) {
    try {
      const { name, cost_price, selling_price, quantity } = req.body;
      
      // Validation
      if (!name || !cost_price || !selling_price || quantity === undefined) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      if (cost_price < 0 || selling_price < 0 || quantity < 0) {
        return res.status(400).json({ error: 'Prices and quantity must be non-negative' });
      }

      const db = dbService.getDatabase();
      
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

      const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      res.status(201).json({ product: newProduct });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }

  /**
   * Update product with automatic expense and income tracking
   */
  static async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const { name, cost_price, selling_price, quantity } = req.body;
      
      // Validation
      if (!name || !cost_price || !selling_price || quantity === undefined) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      if (cost_price < 0 || selling_price < 0 || quantity < 0) {
        return res.status(400).json({ error: 'Prices and quantity must be non-negative' });
      }

      const db = dbService.getDatabase();
      
      // Get old product data
      const oldProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      if (!oldProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Update product
      db.prepare(`
        UPDATE products 
        SET name = ?, cost_price = ?, selling_price = ?, quantity = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(name, cost_price, selling_price, quantity, id);

      // Update auto expenses and income if quantity changed
      const quantityDiff = quantity - oldProduct.quantity;
      if (quantityDiff !== 0) {
        // Update expense
        const costDiff = cost_price * quantityDiff;
        if (costDiff > 0) {
          db.prepare(`
            INSERT INTO expenses (description, amount, type, category, product_id) 
            VALUES (?, ?, 'auto', 'product_cost', ?)
          `).run(`Quantity update cost for ${name}`, costDiff, id);
        }

        // Update income
        const revenueDiff = selling_price * quantityDiff;
        if (revenueDiff > 0) {
          db.prepare(`
            INSERT INTO income (description, amount, type, product_id) 
            VALUES (?, ?, 'auto', ?)
          `).run(`Quantity update revenue for ${name}`, revenueDiff, id);
        }
      }

      const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
      res.json({ product: updatedProduct });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }

  /**
   * Delete product
   */
  static async deleteProduct(req, res) {
    try {
      const { id } = req.params;
      const db = dbService.getDatabase();
      
      const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  /**
   * Get product statistics
   */
  static async getProductStats(req, res) {
    try {
      const db = dbService.getDatabase();
      
      // Total products
      const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
      
      // Total inventory value
      const inventoryValue = db.prepare(`
        SELECT SUM(total_cost) as total_cost, SUM(total_revenue) as total_revenue 
        FROM products
      `).get();
      
      // Low stock products (quantity < 10)
      const lowStockProducts = db.prepare(`
        SELECT * FROM products 
        WHERE quantity < 10 
        ORDER BY quantity ASC
      `).all();
      
      // Top products by revenue
      const topProducts = db.prepare(`
        SELECT * FROM products 
        ORDER BY total_revenue DESC 
        LIMIT 5
      `).all();

      res.json({
        totalProducts: totalProducts.count,
        inventoryValue: {
          totalCost: inventoryValue.total_cost || 0,
          totalRevenue: inventoryValue.total_revenue || 0
        },
        lowStockProducts,
        topProducts
      });
    } catch (error) {
      console.error('Get product stats error:', error);
      res.status(500).json({ error: 'Failed to fetch product statistics' });
    }
  }

  /**
   * Search products
   */
  static async searchProducts(req, res) {
    try {
      const { query } = req.query;
      const db = dbService.getDatabase();
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const products = db.prepare(`
        SELECT * FROM products 
        WHERE name LIKE ? 
        ORDER BY created_at DESC
      `).all(`%${query}%`);

      res.json({ products });
    } catch (error) {
      console.error('Search products error:', error);
      res.status(500).json({ error: 'Failed to search products' });
    }
  }
}

module.exports = ProductController; 