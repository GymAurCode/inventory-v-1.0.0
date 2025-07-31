const express = require('express');
const FinanceController = require('../controllers/FinanceController');
const { authenticateToken, requireStaffOrOwner } = require('../middleware/auth');

const router = express.Router();

// Get financial overview
router.get('/overview', authenticateToken, requireStaffOrOwner, FinanceController.getFinancialOverview);

// Get income details
router.get('/income', authenticateToken, requireStaffOrOwner, FinanceController.getIncomeDetails);

// Create manual income entry
router.post('/income', authenticateToken, requireStaffOrOwner, FinanceController.createIncome);

// Get financial statistics
router.get('/stats', authenticateToken, requireStaffOrOwner, FinanceController.getFinancialStats);

// Get profit and loss statement
router.get('/profit-loss', authenticateToken, requireStaffOrOwner, FinanceController.getProfitLossStatement);

// Get cash flow analysis
router.get('/cash-flow', authenticateToken, requireStaffOrOwner, FinanceController.getCashFlowAnalysis);

// Export to PDF
router.get('/export/pdf', authenticateToken, requireStaffOrOwner, FinanceController.exportToPDF);

// Export to Excel
router.get('/export/excel', authenticateToken, requireStaffOrOwner, FinanceController.exportToExcel);

module.exports = router; 