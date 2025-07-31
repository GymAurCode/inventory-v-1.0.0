const express = require('express');
const ExpenseController = require('../controllers/ExpenseController');
const { authenticateToken, requireStaffOrOwner } = require('../middleware/auth');

const router = express.Router();

// Get all expenses
router.get('/', authenticateToken, requireStaffOrOwner, ExpenseController.getAllExpenses);

// Get single expense
router.get('/:id', authenticateToken, requireStaffOrOwner, ExpenseController.getExpenseById);

// Create expense
router.post('/', authenticateToken, requireStaffOrOwner, ExpenseController.createExpense);

// Update expense
router.put('/:id', authenticateToken, requireStaffOrOwner, ExpenseController.updateExpense);

// Delete expense
router.delete('/:id', authenticateToken, requireStaffOrOwner, ExpenseController.deleteExpense);

// Get expense statistics
router.get('/stats/summary', authenticateToken, requireStaffOrOwner, ExpenseController.getExpenseStats);

// Get expense categories
router.get('/categories/list', authenticateToken, requireStaffOrOwner, ExpenseController.getExpenseCategories);

// Export to PDF
router.get('/export/pdf', authenticateToken, requireStaffOrOwner, ExpenseController.exportToPDF);

// Export to Excel
router.get('/export/excel', authenticateToken, requireStaffOrOwner, ExpenseController.exportToExcel);

module.exports = router; 