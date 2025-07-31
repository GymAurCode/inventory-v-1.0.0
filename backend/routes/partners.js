const express = require('express');
const PartnerController = require('../controllers/PartnerController');
const { authenticateToken, requireOwner } = require('../middleware/auth');

const router = express.Router();

// Get partners
router.get('/', authenticateToken, requireOwner, PartnerController.getAllPartners);

// Get partner profit sharing
router.get('/profit-sharing', authenticateToken, requireOwner, PartnerController.getPartnerProfitSharing);

// Create partner
router.post('/', authenticateToken, requireOwner, PartnerController.createPartner);

// Update partner
router.put('/:id', authenticateToken, requireOwner, PartnerController.updatePartner);

// Delete partner
router.delete('/:id', authenticateToken, requireOwner, PartnerController.deletePartner);

// Get partner statistics
router.get('/stats/summary', authenticateToken, requireOwner, PartnerController.getPartnerStats);

// Get partner profit history
router.get('/profit-history', authenticateToken, requireOwner, PartnerController.getPartnerProfitHistory);

// Export to PDF
router.get('/export/pdf', authenticateToken, requireOwner, PartnerController.exportToPDF);

// Export to Excel
router.get('/export/excel', authenticateToken, requireOwner, PartnerController.exportToExcel);

module.exports = router; 