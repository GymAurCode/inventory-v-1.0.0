const dbService = require('../config/initDb');
const PDFDocument = require('pdfkit');
const Excel = require('exceljs');
const moment = require('moment');

class FinanceController {
  /**
   * Export finance data to PDF
   */
  static async exportToPDF(req, res) {
    try {
      const db = dbService.getDatabase();
      
      // Get financial data
      const income = db.prepare(`
        SELECT i.*, p.name as product_name 
        FROM income i
        LEFT JOIN products p ON i.product_id = p.id
        ORDER BY i.created_at DESC
      `).all();
      
      const expenses = db.prepare(`
        SELECT e.*, p.name as product_name 
        FROM expenses e
        LEFT JOIN products p ON e.product_id = p.id
        ORDER BY e.created_at DESC
      `).all();
      
      // Calculate totals
      const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
      const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
      const netProfit = totalIncome - totalExpenses;
      
      // Create PDF document
      const doc = new PDFDocument();
      const filename = `finance_report_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Add content to PDF
      doc.fontSize(20).text('Financial Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12);
      
      // Add summary
      doc.text('Summary', { underline: true });
      doc.moveDown();
      doc.text(`Total Income: PKR ${totalIncome.toLocaleString()}`);
      doc.text(`Total Expenses: PKR ${totalExpenses.toLocaleString()}`);
      doc.text(`Net Profit: PKR ${netProfit.toLocaleString()}`);
      doc.moveDown(2);
      
      // Income Section
      doc.text('Income Details', { underline: true });
      doc.moveDown();
      doc.fontSize(10);
      
      // Income table headers
      let yPosition = doc.y;
      doc.text('Description', 50, yPosition);
      doc.text('Amount', 200, yPosition);
      doc.text('Product', 300, yPosition);
      doc.text('Date', 400, yPosition);
      
      yPosition += 20;
      
      // Income table rows
      income.forEach((item) => {
        if (yPosition > 700) { // Start new page if near bottom
          doc.addPage();
          yPosition = 50;
        }
        
        doc.text(item.description || '', 50, yPosition);
        doc.text(item.amount.toString(), 200, yPosition);
        doc.text(item.product_name || 'N/A', 300, yPosition);
        doc.text(moment(item.created_at).format('YYYY-MM-DD'), 400, yPosition);
        
        yPosition += 20;
      });
      
      // Expenses Section
      doc.addPage();
      doc.fontSize(12);
      doc.text('Expense Details', { underline: true });
      doc.moveDown();
      doc.fontSize(10);
      
      // Expense table headers
      yPosition = doc.y;
      doc.text('Description', 50, yPosition);
      doc.text('Amount', 200, yPosition);
      doc.text('Category', 300, yPosition);
      doc.text('Product', 400, yPosition);
      doc.text('Date', 500, yPosition);
      
      yPosition += 20;
      
      // Expense table rows
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
        
        yPosition += 20;
      });
      
      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error('Export to PDF error:', error);
      res.status(500).json({ error: 'Failed to export finance report to PDF' });
    }
  }
  
  /**
   * Export finance data to Excel
   */
  static async exportToExcel(req, res) {
    try {
      const db = dbService.getDatabase();
      
      // Get financial data
      const income = db.prepare(`
        SELECT i.*, p.name as product_name 
        FROM income i
        LEFT JOIN products p ON i.product_id = p.id
        ORDER BY i.created_at DESC
      `).all();
      
      const expenses = db.prepare(`
        SELECT e.*, p.name as product_name 
        FROM expenses e
        LEFT JOIN products p ON e.product_id = p.id
        ORDER BY e.created_at DESC
      `).all();
      
      // Calculate totals
      const totalIncome = income.reduce((sum, item) => sum + item.amount, 0);
      const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0);
      const netProfit = totalIncome - totalExpenses;
      
      // Create Excel workbook
      const workbook = new Excel.Workbook();
      
      // Add Summary worksheet
      const summarySheet = workbook.addWorksheet('Summary');
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 20 },
        { header: 'Amount (PKR)', key: 'amount', width: 20 }
      ];
      
      summarySheet.addRow({ metric: 'Total Income', amount: totalIncome });
      summarySheet.addRow({ metric: 'Total Expenses', amount: totalExpenses });
      summarySheet.addRow({ metric: 'Net Profit', amount: netProfit });
      
      // Style summary sheet
      summarySheet.getRow(1).font = { bold: true };
      
      // Add Income worksheet
      const incomeSheet = workbook.addWorksheet('Income');
      incomeSheet.columns = [
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Product', key: 'product_name', width: 20 },
        { header: 'Created At', key: 'created_at', width: 20 }
      ];
      
      // Add income data
      income.forEach(item => {
        incomeSheet.addRow({
          description: item.description || '',
          amount: item.amount,
          product_name: item.product_name || 'N/A',
          created_at: moment(item.created_at).format('YYYY-MM-DD')
        });
      });
      
      // Style income sheet
      incomeSheet.getRow(1).font = { bold: true };
      
      // Add Expenses worksheet
      const expensesSheet = workbook.addWorksheet('Expenses');
      expensesSheet.columns = [
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Product', key: 'product_name', width: 20 },
        { header: 'Created At', key: 'created_at', width: 20 }
      ];
      
      // Add expenses data
      expenses.forEach(expense => {
        expensesSheet.addRow({
          description: expense.description || '',
          amount: expense.amount,
          category: expense.category || '',
          product_name: expense.product_name || 'N/A',
          created_at: moment(expense.created_at).format('YYYY-MM-DD')
        });
      });
      
      // Style expenses sheet
      expensesSheet.getRow(1).font = { bold: true };
      
      // Set filename and headers
      const filename = `finance_report_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export to Excel error:', error);
      res.status(500).json({ error: 'Failed to export finance report to Excel' });
    }
  }
  /**
   * Get financial overview with profit calculations
   */
  static async getFinancialOverview(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const db = dbService.getDatabase();
      
      let incomeQuery = 'SELECT SUM(amount) as total FROM income';
      let expenseQuery = 'SELECT SUM(amount) as total FROM expenses';
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
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        incomeQuery += whereClause;
        expenseQuery += whereClause;
      }

      const totalIncome = db.prepare(incomeQuery).get(...params);
      const totalExpenses = db.prepare(expenseQuery).get(...params);

      const income = totalIncome.total || 0;
      const expenses = totalExpenses.total || 0;
      const netProfit = income - expenses;
      const donation = netProfit * 0.02; // 2% donation
      const partnerProfit = netProfit - donation;
      const partnerAShare = partnerProfit * 0.5; // 50% split
      const partnerBShare = partnerProfit * 0.5; // 50% split

      res.json({
        income,
        expenses,
        netProfit,
        donation,
        partnerProfit,
        partnerAShare,
        partnerBShare
      });
    } catch (error) {
      console.error('Get finance overview error:', error);
      res.status(500).json({ error: 'Failed to fetch financial overview' });
    }
  }

  /**
   * Get income details with filtering
   */
  static async getIncomeDetails(req, res) {
    try {
      const { startDate, endDate, type, product_id } = req.query;
      const db = dbService.getDatabase();
      
      let query = `
        SELECT i.*, p.name as product_name 
        FROM income i 
        LEFT JOIN products p ON i.product_id = p.id
      `;
      const params = [];
      const conditions = [];

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
      res.json({ income });
    } catch (error) {
      console.error('Get income error:', error);
      res.status(500).json({ error: 'Failed to fetch income' });
    }
  }

  /**
   * Create manual income entry
   */
  static async createIncome(req, res) {
    try {
      const { description, amount, type, product_id } = req.body;
      
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
        INSERT INTO income (description, amount, type, product_id) 
        VALUES (?, ?, ?, ?)
      `).run(description, amount, type, product_id || null);

      const incomeId = result.lastInsertRowid;
      const newIncome = db.prepare('SELECT * FROM income WHERE id = ?').get(incomeId);
      
      res.status(201).json({ income: newIncome });
    } catch (error) {
      console.error('Create income error:', error);
      res.status(500).json({ error: 'Failed to create income entry' });
    }
  }

  /**
   * Get comprehensive financial statistics
   */
  static async getFinancialStats(req, res) {
    try {
      const { period = 'monthly' } = req.query; // monthly, quarterly, yearly
      const db = dbService.getDatabase();
      
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
      `).all(dateFormat, dateFormat);

      // Expenses by period
      const expensesByPeriod = db.prepare(`
        SELECT ${groupBy} as period, SUM(amount) as total, COUNT(*) as count
        FROM expenses 
        GROUP BY ${groupBy} 
        ORDER BY period DESC
        LIMIT 12
      `).all(dateFormat, dateFormat);

      // Income by type
      const incomeByType = db.prepare(`
        SELECT type, SUM(amount) as total, COUNT(*) as count
        FROM income 
        GROUP BY type
      `).all();

      // Expenses by type
      const expensesByType = db.prepare(`
        SELECT type, SUM(amount) as total, COUNT(*) as count
        FROM expenses 
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

      // Profit margin calculation
      const totalIncome = db.prepare('SELECT SUM(amount) as total FROM income').get();
      const totalExpenses = db.prepare('SELECT SUM(amount) as total FROM expenses').get();
      const grossIncome = totalIncome.total || 0;
      const grossExpenses = totalExpenses.total || 0;
      const profitMargin = grossIncome > 0 ? ((grossIncome - grossExpenses) / grossIncome) * 100 : 0;

      res.json({
        incomeByPeriod,
        expensesByPeriod,
        incomeByType,
        expensesByType,
        topIncomeSources,
        summary: {
          totalIncome: grossIncome,
          totalExpenses: grossExpenses,
          netProfit: grossIncome - grossExpenses,
          profitMargin: profitMargin.toFixed(2)
        }
      });
    } catch (error) {
      console.error('Get finance stats error:', error);
      res.status(500).json({ error: 'Failed to fetch financial statistics' });
    }
  }

  /**
   * Get profit and loss statement
   */
  static async getProfitLossStatement(req, res) {
    try {
      const { startDate, endDate } = req.query;
      const db = dbService.getDatabase();
      
      let incomeQuery = 'SELECT SUM(amount) as total FROM income';
      let expenseQuery = 'SELECT SUM(amount) as total FROM expenses';
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
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        incomeQuery += whereClause;
        expenseQuery += whereClause;
      }

      const totalIncome = db.prepare(incomeQuery).get(...params);
      const totalExpenses = db.prepare(expenseQuery).get(...params);

      const income = totalIncome.total || 0;
      const expenses = totalExpenses.total || 0;
      const netProfit = income - expenses;

      // Get detailed breakdown
      const incomeBreakdown = db.prepare(`
        SELECT type, SUM(amount) as total, COUNT(*) as count
        FROM income
        GROUP BY type
      `).all();

      const expenseBreakdown = db.prepare(`
        SELECT category, SUM(amount) as total, COUNT(*) as count
        FROM expenses
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY total DESC
      `).all();

      res.json({
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present'
        },
        revenue: {
          total: income,
          breakdown: incomeBreakdown
        },
        expenses: {
          total: expenses,
          breakdown: expenseBreakdown
        },
        profit: {
          gross: income,
          net: netProfit,
          margin: income > 0 ? ((netProfit / income) * 100).toFixed(2) : '0.00'
        }
      });
    } catch (error) {
      console.error('Get P&L statement error:', error);
      res.status(500).json({ error: 'Failed to generate profit and loss statement' });
    }
  }

  /**
   * Get cash flow analysis
   */
  static async getCashFlowAnalysis(req, res) {
    try {
      const { months = 6 } = req.query;
      const db = dbService.getDatabase();
      
      // Get monthly cash flow for the specified number of months
      const cashFlow = db.prepare(`
        SELECT 
          strftime('%Y-%m', created_at) as month,
          'income' as type,
          SUM(amount) as amount
        FROM income
        WHERE created_at >= date('now', '-${months} months')
        GROUP BY strftime('%Y-%m', created_at)
        
        UNION ALL
        
        SELECT 
          strftime('%Y-%m', created_at) as month,
          'expense' as type,
          SUM(amount) as amount
        FROM expenses
        WHERE created_at >= date('now', '-${months} months')
        GROUP BY strftime('%Y-%m', created_at)
        
        ORDER BY month DESC, type
      `).all();

      // Process cash flow data
      const monthlyData = {};
      cashFlow.forEach(item => {
        if (!monthlyData[item.month]) {
          monthlyData[item.month] = { income: 0, expenses: 0, net: 0 };
        }
        if (item.type === 'income') {
          monthlyData[item.month].income = item.amount;
        } else {
          monthlyData[item.month].expenses = item.amount;
        }
        monthlyData[item.month].net = monthlyData[item.month].income - monthlyData[item.month].expenses;
      });

      const cashFlowArray = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        ...data
      }));

      res.json({
        period: `${months} months`,
        cashFlow: cashFlowArray,
        summary: {
          totalIncome: cashFlowArray.reduce((sum, item) => sum + item.income, 0),
          totalExpenses: cashFlowArray.reduce((sum, item) => sum + item.expenses, 0),
          netCashFlow: cashFlowArray.reduce((sum, item) => sum + item.net, 0)
        }
      });
    } catch (error) {
      console.error('Get cash flow analysis error:', error);
      res.status(500).json({ error: 'Failed to generate cash flow analysis' });
    }
  }

  /**
   * Export financial report
   */
  static async exportFinancialReport(req, res) {
    try {
      const { startDate, endDate, format = 'csv' } = req.query;
      const db = dbService.getDatabase();
      
      let incomeQuery = 'SELECT SUM(amount) as total FROM income';
      let expenseQuery = 'SELECT SUM(amount) as total FROM expenses';
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
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        incomeQuery += whereClause;
        expenseQuery += whereClause;
      }

      const totalIncome = db.prepare(incomeQuery).get(...params);
      const totalExpenses = db.prepare(expenseQuery).get(...params);

      const income = totalIncome.total || 0;
      const expenses = totalExpenses.total || 0;
      const netProfit = income - expenses;

      if (format === 'csv') {
        const csvContent = `Period,Income,Expenses,Net Profit,Profit Margin
${startDate || 'All time'},${income},${expenses},${netProfit},${income > 0 ? ((netProfit / income) * 100).toFixed(2) : '0.00'}%`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=financial_report.csv');
        res.send(csvContent);
      } else {
        res.json({
          period: { startDate, endDate },
          summary: { income, expenses, netProfit, profitMargin: income > 0 ? ((netProfit / income) * 100).toFixed(2) : '0.00' }
        });
      }
    } catch (error) {
      console.error('Export financial report error:', error);
      res.status(500).json({ error: 'Failed to export financial report' });
    }
  }
}

module.exports = FinanceController; 