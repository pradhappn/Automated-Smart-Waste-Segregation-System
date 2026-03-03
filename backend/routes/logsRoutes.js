const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    getLogs,
    getLogById,
    getLogStatistics,
    createLog,
    cleanupLogs,
    exportLogs,
} = require('../controllers/logsController');

// All log routes require authentication
router.use(protect);

// Get all logs
router.get('/', getLogs);

// Get log statistics
router.get('/statistics', getLogStatistics);

// Export logs
router.get('/export', exportLogs);

// Create log
router.post('/', createLog);

// Cleanup old logs (admin only)
router.delete('/cleanup', authorize('admin'), cleanupLogs);

// Get specific log
router.get('/:id', getLogById);

module.exports = router;
