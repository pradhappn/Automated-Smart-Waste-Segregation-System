const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { validateWasteData } = require('../middleware/validation');
const {
    processWaste,
    getWaste,
    getWasteById,
    getWasteStatistics,
    deleteWaste,
} = require('../controllers/wasteController');

// All waste routes require authentication
router.use(protect);

// Process waste
router.post('/process', validateWasteData, processWaste);

// Get all waste
router.get('/', getWaste);

// Get statistics
router.get('/statistics', getWasteStatistics);

// Get specific waste
router.get('/:id', getWasteById);

// Delete waste (admin only)
router.delete('/:id', authorize('admin'), deleteWaste);

module.exports = router;
