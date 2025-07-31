const dbService = require('../config/initDb');
const PDFDocument = require('pdfkit');
const Excel = require('exceljs');
const moment = require('moment');

class PartnerController {
  /**
   * Export partners data to PDF
   */
  static async exportToPDF(req, res) {
    try {
      const db = dbService.getDatabase();
      
      // Get partners data
      const partners = db.prepare(`
        SELECT * FROM partners ORDER BY name
      `).all();
      
      // Create PDF document
      const doc = new PDFDocument();
      const filename = `partners_report_${moment().format('YYYY-MM-DD_HH-mm')}.pdf`;
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Pipe PDF to response
      doc.pipe(res);
      
      // Add content to PDF
      doc.fontSize(20).text('Partners Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12);
      
      // Partners Section
      doc.text('Partners List', { underline: true });
      doc.moveDown();
      doc.fontSize(10);
      
      // Partners table headers
      let yPosition = doc.y;
      doc.text('Name', 50, yPosition);
      doc.text('Share %', 200, yPosition);
      doc.text('Contact', 300, yPosition);
      doc.text('Status', 400, yPosition);
      doc.text('Joined Date', 500, yPosition);
      
      yPosition += 20;
      
      // Partners table rows
      partners.forEach((partner) => {
        if (yPosition > 700) { // Start new page if near bottom
          doc.addPage();
          yPosition = 50;
        }
        
        doc.text(partner.name || '', 50, yPosition);
        doc.text((partner.share_percentage || 0).toString() + '%', 200, yPosition);
        doc.text(partner.contact || 'N/A', 300, yPosition);
        doc.text(partner.status || 'Active', 400, yPosition);
        doc.text(moment(partner.created_at).format('YYYY-MM-DD'), 500, yPosition);
        
        yPosition += 20;
      });
      
      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error('Export to PDF error:', error);
      res.status(500).json({ error: 'Failed to export partners report to PDF' });
    }
  }
  
  /**
   * Export partners data to Excel
   */
  static async exportToExcel(req, res) {
    try {
      const db = dbService.getDatabase();
      
      // Get partners data
      const partners = db.prepare(`
        SELECT * FROM partners ORDER BY name
      `).all();
      
      // Create Excel workbook
      const workbook = new Excel.Workbook();
      
      // Add Partners worksheet
      const partnersSheet = workbook.addWorksheet('Partners');
      partnersSheet.columns = [
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Share %', key: 'share_percentage', width: 15 },
        { header: 'Contact', key: 'contact', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Joined Date', key: 'created_at', width: 20 }
      ];
      
      // Add partners data
      partners.forEach(partner => {
        partnersSheet.addRow({
          name: partner.name || '',
          share_percentage: (partner.share_percentage || 0) + '%',
          contact: partner.contact || 'N/A',
          status: partner.status || 'Active',
          created_at: moment(partner.created_at).format('YYYY-MM-DD')
        });
      });
      
      // Style partners sheet
      partnersSheet.getRow(1).font = { bold: true };
      
      // Set filename and headers
      const filename = `partners_report_${moment().format('YYYY-MM-DD_HH-mm')}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export to Excel error:', error);
      res.status(500).json({ error: 'Failed to export partners report to Excel' });
    }
  }
  /**
   * Get all partners
   */
  static async getAllPartners(req, res) {
    try {
      const db = dbService.getDatabase();
      const partners = db.prepare(`
        SELECT * FROM partners 
        ORDER BY created_at DESC
      `).all();

      res.json({ partners });
    } catch (error) {
      console.error('Get partners error:', error);
      res.status(500).json({ error: 'Failed to fetch partners' });
    }
  }

  /**
   * Get partner profit sharing calculations
   */
  static async getPartnerProfitSharing(req, res) {
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

      // Get partners and their shares
      const partners = db.prepare('SELECT * FROM partners ORDER BY created_at').all();
      
      const partnerShares = partners.map(partner => ({
        ...partner,
        share_amount: (partnerProfit * partner.share_percentage) / 100
      }));

      // Calculate total share percentage
      const totalSharePercentage = partners.reduce((sum, partner) => sum + partner.share_percentage, 0);

      res.json({
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Present'
        },
        financials: {
          income,
          expenses,
          netProfit,
          donation,
          partnerProfit
        },
        partners: partnerShares,
        totalSharePercentage,
        remainingShare: 100 - totalSharePercentage
      });
    } catch (error) {
      console.error('Get partner profit sharing error:', error);
      res.status(500).json({ error: 'Failed to fetch partner profit sharing' });
    }
  }

  /**
   * Create new partner
   */
  static async createPartner(req, res) {
    try {
      const { name, share_percentage } = req.body;
      
      // Validation
      if (!name || share_percentage === undefined) {
        return res.status(400).json({ error: 'Name and share percentage are required' });
      }

      if (share_percentage < 0 || share_percentage > 100) {
        return res.status(400).json({ error: 'Share percentage must be between 0 and 100' });
      }

      const db = dbService.getDatabase();
      
      // Check total share percentage
      const totalShares = db.prepare('SELECT SUM(share_percentage) as total FROM partners').get();
      const currentTotal = totalShares.total || 0;
      
      if (currentTotal + share_percentage > 100) {
        return res.status(400).json({ 
          error: `Total share percentage cannot exceed 100%. Current total: ${currentTotal}%` 
        });
      }

      const result = db.prepare(`
        INSERT INTO partners (name, share_percentage) 
        VALUES (?, ?)
      `).run(name, share_percentage);

      const partnerId = result.lastInsertRowid;
      const newPartner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId);
      
      res.status(201).json({ partner: newPartner });
    } catch (error) {
      console.error('Create partner error:', error);
      res.status(500).json({ error: 'Failed to create partner' });
    }
  }

  /**
   * Update partner
   */
  static async updatePartner(req, res) {
    try {
      const { id } = req.params;
      const { name, share_percentage } = req.body;
      
      // Validation
      if (!name || share_percentage === undefined) {
        return res.status(400).json({ error: 'Name and share percentage are required' });
      }

      if (share_percentage < 0 || share_percentage > 100) {
        return res.status(400).json({ error: 'Share percentage must be between 0 and 100' });
      }

      const db = dbService.getDatabase();
      
      // Check if partner exists
      const currentPartner = db.prepare('SELECT share_percentage FROM partners WHERE id = ?').get(id);
      if (!currentPartner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      // Check total share percentage excluding current partner
      const otherPartnersTotal = db.prepare(`
        SELECT SUM(share_percentage) as total 
        FROM partners 
        WHERE id != ?
      `).get(id);
      
      const currentTotal = otherPartnersTotal.total || 0;
      
      if (currentTotal + share_percentage > 100) {
        return res.status(400).json({ 
          error: `Total share percentage cannot exceed 100%. Current total: ${currentTotal}%` 
        });
      }

      const result = db.prepare(`
        UPDATE partners 
        SET name = ?, share_percentage = ? 
        WHERE id = ?
      `).run(name, share_percentage, id);

      if (result.changes === 0) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      const updatedPartner = db.prepare('SELECT * FROM partners WHERE id = ?').get(id);
      res.json({ partner: updatedPartner });
    } catch (error) {
      console.error('Update partner error:', error);
      res.status(500).json({ error: 'Failed to update partner' });
    }
  }

  /**
   * Delete partner
   */
  static async deletePartner(req, res) {
    try {
      const { id } = req.params;
      const db = dbService.getDatabase();
      
      const result = db.prepare('DELETE FROM partners WHERE id = ?').run(id);
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      res.json({ message: 'Partner deleted successfully' });
    } catch (error) {
      console.error('Delete partner error:', error);
      res.status(500).json({ error: 'Failed to delete partner' });
    }
  }

  /**
   * Get partner statistics
   */
  static async getPartnerStats(req, res) {
    try {
      const db = dbService.getDatabase();
      
      // Total partners
      const totalPartners = db.prepare('SELECT COUNT(*) as count FROM partners').get();
      
      // Total share percentage
      const totalSharePercentage = db.prepare('SELECT SUM(share_percentage) as total FROM partners').get();
      
      // Partners by share percentage
      const partnersByShare = db.prepare(`
        SELECT * FROM partners 
        ORDER BY share_percentage DESC
      `).all();

      // Calculate current profit sharing
      const totalIncome = db.prepare('SELECT SUM(amount) as total FROM income').get();
      const totalExpenses = db.prepare('SELECT SUM(amount) as total FROM expenses').get();
      const netProfit = (totalIncome.total || 0) - (totalExpenses.total || 0);
      const donation = netProfit * 0.02;
      const partnerProfit = netProfit - donation;

      const partnerShares = partnersByShare.map(partner => ({
        ...partner,
        share_amount: (partnerProfit * partner.share_percentage) / 100
      }));

      res.json({
        summary: {
          totalPartners: totalPartners.count,
          totalSharePercentage: totalSharePercentage.total || 0,
          remainingShare: 100 - (totalSharePercentage.total || 0)
        },
        partners: partnerShares,
        profitSharing: {
          netProfit,
          donation,
          partnerProfit,
          totalDistributed: partnerShares.reduce((sum, p) => sum + p.share_amount, 0)
        }
      });
    } catch (error) {
      console.error('Get partner stats error:', error);
      res.status(500).json({ error: 'Failed to fetch partner statistics' });
    }
  }

  /**
   * Get partner profit history
   */
  static async getPartnerProfitHistory(req, res) {
    try {
      const { partnerId, months = 6 } = req.query;
      const db = dbService.getDatabase();
      
      if (!partnerId) {
        return res.status(400).json({ error: 'Partner ID is required' });
      }

      // Verify partner exists
      const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId);
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      // Get monthly profit data
      const profitHistory = db.prepare(`
        SELECT 
          strftime('%Y-%m', created_at) as month,
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses
        FROM (
          SELECT created_at, amount, 'income' as type FROM income
          UNION ALL
          SELECT created_at, amount, 'expense' as type FROM expenses
        )
        WHERE created_at >= date('now', '-${months} months')
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month DESC
      `).all();

      // Calculate partner's share for each month
      const partnerProfitHistory = profitHistory.map(month => {
        const netProfit = month.income - month.expenses;
        const donation = netProfit * 0.02;
        const partnerProfit = netProfit - donation;
        const partnerShare = (partnerProfit * partner.share_percentage) / 100;

        return {
          month: month.month,
          income: month.income,
          expenses: month.expenses,
          netProfit,
          donation,
          partnerProfit,
          partnerShare
        };
      });

      res.json({
        partner,
        history: partnerProfitHistory,
        summary: {
          totalIncome: partnerProfitHistory.reduce((sum, month) => sum + month.income, 0),
          totalExpenses: partnerProfitHistory.reduce((sum, month) => sum + month.expenses, 0),
          totalNetProfit: partnerProfitHistory.reduce((sum, month) => sum + month.netProfit, 0),
          totalPartnerShare: partnerProfitHistory.reduce((sum, month) => sum + month.partnerShare, 0)
        }
      });
    } catch (error) {
      console.error('Get partner profit history error:', error);
      res.status(500).json({ error: 'Failed to fetch partner profit history' });
    }
  }

  /**
   * Export partner profit sharing report
   */
  static async exportPartnerReport(req, res) {
    try {
      const { startDate, endDate, format = 'csv' } = req.query;
      const db = dbService.getDatabase();
      
      // Get financial data
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
      const donation = netProfit * 0.02;
      const partnerProfit = netProfit - donation;

      // Get partners
      const partners = db.prepare('SELECT * FROM partners ORDER BY created_at').all();
      
      const partnerShares = partners.map(partner => ({
        ...partner,
        share_amount: (partnerProfit * partner.share_percentage) / 100
      }));

      if (format === 'csv') {
        const csvHeader = 'Partner Name,Share Percentage,Share Amount\n';
        const csvData = partnerShares.map(partner => 
          `${partner.name},${partner.share_percentage}%,${partner.share_amount.toFixed(2)}`
        ).join('\n');

        const csvContent = csvHeader + csvData;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=partner_report.csv');
        res.send(csvContent);
      } else {
        res.json({
          period: { startDate, endDate },
          financials: { income, expenses, netProfit, donation, partnerProfit },
          partners: partnerShares
        });
      }
    } catch (error) {
      console.error('Export partner report error:', error);
      res.status(500).json({ error: 'Failed to export partner report' });
    }
  }
}

module.exports = PartnerController; 