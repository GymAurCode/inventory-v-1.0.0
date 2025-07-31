const express = require('express');
const ProductController = require('../controllers/ProductController');
const { authenticateToken, requireStaffOrOwner } = require('../middleware/auth');

const router = express.Router();

// Get all products
router.get('/', authenticateToken, requireStaffOrOwner, ProductController.getAllProducts);

// Get single product
router.get('/:id', authenticateToken, requireStaffOrOwner, ProductController.getProductById);

// Create product
router.post('/', authenticateToken, requireStaffOrOwner, ProductController.createProduct);

// Update product
router.put('/:id', authenticateToken, requireStaffOrOwner, ProductController.updateProduct);

// Delete product
router.delete('/:id', authenticateToken, requireStaffOrOwner, ProductController.deleteProduct);

// Get product statistics
router.get('/stats/summary', authenticateToken, requireStaffOrOwner, ProductController.getProductStats);

// Search products
router.get('/search/query', authenticateToken, requireStaffOrOwner, ProductController.searchProducts);

// Export to PDF
router.get('/export/pdf', authenticateToken, requireStaffOrOwner, ProductController.exportToPDF);

// Export to Excel
router.get('/export/excel', authenticateToken, requireStaffOrOwner, ProductController.exportToExcel);

module.exports = router; 