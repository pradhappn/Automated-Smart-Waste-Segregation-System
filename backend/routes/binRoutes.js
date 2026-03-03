const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    getBins,
    getBinByType,
    emptyBin,
    updateBin,
    getBinStatistics,
    checkBinStatus,
    initializeBins,
} = require('../controllers/binController');

// All bin routes require authentication
router.use(protect);

// Initialize bins
router.post('/initialize', authorize('admin'), initializeBins);

// Get all bins
router.get('/', getBins);

// Get bin statistics
router.get('/statistics', getBinStatistics);

// Check bin status and alerts
router.get('/check-status', checkBinStatus);

// Get specific bin
router.get('/:type', getBinByType);

// Empty specific bin
router.post('/:type/empty', emptyBin);

// Update bin (admin only)
router.put('/:type', authorize('admin'), updateBin);

module.exports = router;
