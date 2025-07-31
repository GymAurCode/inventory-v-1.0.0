const dbService = require('../config/initDb');
const PDFDocument = require('pdfkit');
const Excel = require('exceljs');
const moment = require('moment');

class ExpenseController {
  /**
   * Export expenses to PDF
   */
  static async exportToPDF(req, res) {
    try {
      const db = dbService.getDatabase();
      const expenses = db.prepare(`
        SELECT e.*, p.name as product_name 
        FROM expenses e 
        LEFT JOIN products p ON e.product_id = p.id
        ORDER BY e.created_at DESC
      `).all();
      
      // Create PDF document
      const doc = new PDFDocument();
      const filename = `expenses_export_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Add content to PDF
      doc.fontSize(20).text('Expenses Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10);
      
      // Add table headers
      const tableTop = 150;
      doc.text('Description', 50, tableTop);
      doc.text('Amount', 200, tableTop);
      doc.text('Category', 300, tableTop);
      doc.text('Product', 400, tableTop);
      doc.text('Date', 500, tableTop);
      
      let yPosition = tableTop + 30;
      
      // Add table rows
      expenses.forEach((expense) => {
        if (yPosition > 700) { // Start new page if near bottom
          doc.addPage();
          yPosition = 50;
        }
        
        doc.text(expense.description || '', 50, yPosition);
        doc.text(expense.amount.toString(), 200, yPosition);
        doc.text(expense.category || '', 300, yPosition);
        doc.text(expense.product_name || 'N/A', 400, yPosition);
        doc.text(moment(expense.created_at).format('YYYY-MM-DD'), 500, yPosition);
        
        yPosition += 30;
      });
      
      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error('Export to PDF error:', error);
      res.status(500).json({ error: 'Failed to export expenses to PDF' });
    }
  }
  
  /**
   * Export expenses to Excel
   */
  static async exportToExcel(req, res) {
    try {
      const db = dbService.getDatabase();
      const expenses = db.prepare(`
        SELECT e.*, p.name as product_name 
        FROM expenses e 
        LEFT JOIN products p ON e.product_id = p.id
        ORDER BY e.created_at DESC
      `).all();
      
      // Create Excel workbook and worksheet
      const workbook = new Excel.Workbook();
      const worksheet = workbook.addWorksheet('Expenses');
      
      // Set up columns
      worksheet.columns = [
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Product', key: 'product_name', width: 20 },
        { header: 'Created At', key: 'created_at', width: 20 }
      ];
      
      // Style the header row
      worksheet.getRow(1).font = { bold: true };
      
      // Add data rows
      expenses.forEach(expense => {
        worksheet.addRow({
          description: expense.description || '',
          amount: expense.amount,
          category: expense.category || '',
          product_name: expense.product_name || 'N/A',
          created_at: moment(expense.created_at).format('YYYY-MM-DD')
        });
      });
      
      // Set filename and headers
      const filename = `expenses_export_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export to Excel error:', error);
      res.status(500).json({ error: 'Failed to export expenses to Excel' });
    }
  }
  /**
   * Get all expenses with optional filtering
   */
  static async getAllExpenses(req, res) {
    try {
      const { type, category, startDate, endDate, product_id } = req.query;
      const db = dbService.getDatabase();
      
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
      res.json({ expenses });
    } catch (error) {
      console.error('Get expenses error:', error);
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  }

  /**
   * Get single expense by ID
   */
  static async getExpenseById(req, res) {
    try {
      const { id } = req.params;
      const db = dbService.getDatabase();
      
      const expense = db.prepare(`
        SELECT e.*, p.name as product_name 
        FROM expenses e 
        LEFT JOIN products p ON e.product_id = p.id 
        WHERE e.id = ?
      `).get(id);

      if (!expense) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      res.json({ expense });
    } catch (error) {
      console.error('Get expense error:', error);
      res.status(500).json({ error: 'Failed to fetch expense' });
    }
  }

  /**
   * Create new expense
   */
  static async createExpense(req, res) {
    try {
      const { description, amount, type, category, product_id } = req.body;
      
      // Validation
      if (!description || !amount || !type) {
        return res.status(400).json({ error: 'Description, amount, and type are required' });
      }

      if (type !== 'manual' && type !== 'auto') {
        return res.status(400).json({ error: 'Type must be either manual or auto' });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
      }

      const db = dbService.getDatabase();
      
      // Validate product_id if provided
      if (product_id) {
        const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
        if (!product) {
          return res.status(400).json({ error: 'Invalid product ID' });
        }
      }

      const result = db.prepare(`
        INSERT INTO expenses (description, amount, type, category, product_id) 
        VALUES (?, ?, ?, ?, ?)
      `).run(description, amount, type, category || null, product_id || null);

      const expenseId = result.lastInsertRowid;
      const newExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
      
      res.status(201).json({ expense: newExpense });
    } catch (error) {
      console.error('Create expense error:', error);
      res.status(500).json({ error: 'Failed to create expense' });
    }
  }

  /**
   * Update expense
   */
  static async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const { description, amount, type, category, product_id } = req.body;
      
      // Validation
      if (!description || !amount || !type) {
        return res.status(400).json({ error: 'Description, amount, and type are required' });
      }

      if (type !== 'manual' && type !== 'auto') {
        return res.status(400).json({ error: 'Type must be either manual or auto' });
      }

      if (amount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than 0' });
      }

      const db = dbService.getDatabase();
      
      // Validate product_id if provided
      if (product_id) {
        const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
        if (!product) {
          return res.status(400).json({ error: 'Invalid product ID' });
        }
      }

      const result = db.prepare(`
        UPDATE expenses 
        SET description = ?, amount = ?, type = ?, category = ?, product_id = ? 
        WHERE id = ?
      `).run(description, amount, type, category || null, product_id || null, id);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      const updatedExpense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
      res.json({ expense: updatedExpense });
    } catch (error) {
      console.error('Update expense error:', error);
      res.status(500).json({ error: 'Failed to update expense' });
    }
  }

  /**
   * Delete expense
   */
  static async deleteExpense(req, res) {
    try {
      const { id } = req.params;
      const db = dbService.getDatabase();
      
      const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      console.error('Delete expense error:', error);
      res.status(500).json({ error: 'Failed to delete expense' });
    }
  }

  /**
   * Get expense statistics and summary
   */
  static async getExpenseStats(req, res) {
    try {
      const { startDate, endDate, groupBy = 'category' } = req.query;
      const db = dbService.getDatabase();
      
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

      res.json({
        total: total.total || 0,
        byType,
        byCategory,
        byMonth,
        topExpenses
      });
    } catch (error) {
      console.error('Get expense stats error:', error);
      res.status(500).json({ error: 'Failed to fetch expense statistics' });
    }
  }

  /**
   * Get expense categories
   */
  static async getExpenseCategories(req, res) {
    try {
      const db = dbService.getDatabase();
      
      const categories = db.prepare(`
        SELECT DISTINCT category 
        FROM expenses 
        WHERE category IS NOT NULL 
        ORDER BY category
      `).all();

      res.json({ categories: categories.map(c => c.category) });
    } catch (error) {
      console.error('Get expense categories error:', error);
      res.status(500).json({ error: 'Failed to fetch expense categories' });
    }
  }

  /**
   * Export expenses to CSV format
   */
  static async exportExpenses(req, res) {
    try {
      const { startDate, endDate, type, category } = req.query;
      const db = dbService.getDatabase();
      
      let query = `
        SELECT e.*, p.name as product_name 
        FROM expenses e 
        LEFT JOIN products p ON e.product_id = p.id
      `;
      const params = [];
      const conditions = [];

      if (type) {
        conditions.push('e.type = ?');
        params.push(type);
      }

      if (category) {
        conditions.push('e.category = ?');
        params.push(category);
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
      
      // Convert to CSV format
      const csvHeader = 'ID,Description,Amount,Type,Category,Product,Date\n';
      const csvData = expenses.map(expense => 
        `${expense.id},"${expense.description}",${expense.amount},${expense.type},${expense.category || ''},${expense.product_name || ''},${expense.created_at}`
      ).join('\n');

      const csvContent = csvHeader + csvData;
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
      res.send(csvContent);
    } catch (error) {
      console.error('Export expenses error:', error);
      res.status(500).json({ error: 'Failed to export expenses' });
    }
  }
}

module.exports = ExpenseController; 