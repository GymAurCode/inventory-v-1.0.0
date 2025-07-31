const { getDatabase } = require('../db/init');

class Partner {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.share_percentage = data.share_percentage;
    this.created_at = data.created_at;
  }

  /**
   * Create a new partner
   */
  static async create(partnerData) {
    try {
      const { name, share_percentage } = partnerData;
      
      // Validation
      if (!name || share_percentage === undefined) {
        throw new Error('Name and share percentage are required');
      }

      if (share_percentage < 0 || share_percentage > 100) {
        throw new Error('Share percentage must be between 0 and 100');
      }

      if (name.trim().length === 0) {
        throw new Error('Partner name cannot be empty');
      }

      const db = getDatabase();
      
      // Check total share percentage
      const totalShares = db.prepare('SELECT SUM(share_percentage) as total FROM partners').get();
      const currentTotal = totalShares.total || 0;
      
      if (currentTotal + share_percentage > 100) {
        throw new Error(`Total share percentage cannot exceed 100%. Current total: ${currentTotal}%`);
      }

      const result = db.prepare(`
        INSERT INTO partners (name, share_percentage) 
        VALUES (?, ?)
      `).run(name, share_percentage);

      const partnerId = result.lastInsertRowid;
      const newPartner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId);
      
      return new Partner(newPartner);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find partner by ID
   */
  static findById(id) {
    try {
      const db = getDatabase();
      const partnerData = db.prepare('SELECT * FROM partners WHERE id = ?').get(id);
      
      return partnerData ? new Partner(partnerData) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find partner by name
   */
  static findByName(name) {
    try {
      const db = getDatabase();
      const partnerData = db.prepare('SELECT * FROM partners WHERE name = ?').get(name);
      
      return partnerData ? new Partner(partnerData) : null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all partners
   */
  static findAll() {
    try {
      const db = getDatabase();
      const partners = db.prepare('SELECT * FROM partners ORDER BY created_at DESC').all();
      
      return partners.map(partnerData => new Partner(partnerData));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update partner
   */
  async update(updateData) {
    try {
      const { name, share_percentage } = updateData;
      
      // Validation
      if (share_percentage !== undefined && (share_percentage < 0 || share_percentage > 100)) {
        throw new Error('Share percentage must be between 0 and 100');
      }
      
      if (name !== undefined && name.trim().length === 0) {
        throw new Error('Partner name cannot be empty');
      }

      const db = getDatabase();
      
      // Check if partner exists
      const currentPartner = db.prepare('SELECT share_percentage FROM partners WHERE id = ?').get(this.id);
      if (!currentPartner) {
        throw new Error('Partner not found');
      }

      // Check total share percentage excluding current partner
      const otherPartnersTotal = db.prepare(`
        SELECT SUM(share_percentage) as total 
        FROM partners 
        WHERE id != ?
      `).get(this.id);
      
      const currentTotal = otherPartnersTotal.total || 0;
      const newSharePercentage = share_percentage !== undefined ? share_percentage : this.share_percentage;
      
      if (currentTotal + newSharePercentage > 100) {
        throw new Error(`Total share percentage cannot exceed 100%. Current total: ${currentTotal}%`);
      }

      // Prepare update values
      const updateFields = [];
      const values = [];
      
      if (name !== undefined) {
        updateFields.push('name = ?');
        values.push(name);
      }
      
      if (share_percentage !== undefined) {
        updateFields.push('share_percentage = ?');
        values.push(share_percentage);
      }
      
      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }
      
      values.push(this.id);

      const result = db.prepare(`
        UPDATE partners 
        SET ${updateFields.join(', ')} 
        WHERE id = ?
      `).run(...values);

      if (result.changes === 0) {
        throw new Error('Partner not found');
      }

      // Update local instance
      Object.assign(this, updateData);
      
      return this;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete partner
   */
  async delete() {
    try {
      const db = getDatabase();
      const result = db.prepare('DELETE FROM partners WHERE id = ?').run(this.id);
      
      if (result.changes === 0) {
        throw new Error('Partner not found');
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get partner profit sharing calculations
   */
  static getProfitSharing(filters = {}) {
    try {
      const { startDate, endDate } = filters;
      const db = getDatabase();
      
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

      return {
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
        partners: partnerShares.map(partner => new Partner(partner)),
        totalSharePercentage,
        remainingShare: 100 - totalSharePercentage
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get partner statistics
   */
  static getStats() {
    try {
      const db = getDatabase();
      
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

      return {
        summary: {
          totalPartners: totalPartners.count,
          totalSharePercentage: totalSharePercentage.total || 0,
          remainingShare: 100 - (totalSharePercentage.total || 0)
        },
        partners: partnerShares.map(partner => new Partner(partner)),
        profitSharing: {
          netProfit,
          donation,
          partnerProfit,
          totalDistributed: partnerShares.reduce((sum, p) => sum + p.share_amount, 0)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get partner profit history
   */
  static getProfitHistory(partnerId, filters = {}) {
    try {
      const { months = 6 } = filters;
      
      if (!partnerId) {
        throw new Error('Partner ID is required');
      }

      const db = getDatabase();
      
      // Verify partner exists
      const partner = db.prepare('SELECT * FROM partners WHERE id = ?').get(partnerId);
      if (!partner) {
        throw new Error('Partner not found');
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

      return {
        partner: new Partner(partner),
        history: partnerProfitHistory,
        summary: {
          totalIncome: partnerProfitHistory.reduce((sum, month) => sum + month.income, 0),
          totalExpenses: partnerProfitHistory.reduce((sum, month) => sum + month.expenses, 0),
          totalNetProfit: partnerProfitHistory.reduce((sum, month) => sum + month.netProfit, 0),
          totalPartnerShare: partnerProfitHistory.reduce((sum, month) => sum + month.partnerShare, 0)
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate partner's share amount
   */
  calculateShareAmount(netProfit) {
    const donation = netProfit * 0.02;
    const partnerProfit = netProfit - donation;
    return (partnerProfit * this.share_percentage) / 100;
  }

  /**
   * Get partner data for API response
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      share_percentage: this.share_percentage,
      created_at: this.created_at
    };
  }
}

module.exports = Partner;