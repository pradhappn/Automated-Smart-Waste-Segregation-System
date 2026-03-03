const SystemLog = require('../models/SystemLog');

// @desc    Get all system logs
// @route   GET /api/logs
// @access  Private
exports.getLogs = async (req, res, next) => {
    try {
        const { action, level, page = 1, limit = 50 } = req.query;

        const skip = (page - 1) * limit;

        let filter = {};
        if (action) {
            filter.action = action;
        }
        if (level) {
            filter.level = level;
        }

        const logs = await SystemLog.find(filter)
            .populate('user', 'name email')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });

        const total = await SystemLog.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: logs.length,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: logs,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get log by ID
// @route   GET /api/logs/:id
// @access  Private
exports.getLogById = async (req, res, next) => {
    try {
        const log = await SystemLog.findById(req.params.id).populate('user', 'name email');

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'Log not found',
            });
        }

        res.status(200).json({
            success: true,
            data: log,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get log statistics
// @route   GET /api/logs/statistics
// @access  Private
exports.getLogStatistics = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        let start = new Date();
        start.setDate(start.getDate() - 7); // Default to last 7 days

        let end = new Date();

        if (startDate) {
            start = new Date(startDate);
        }
        if (endDate) {
            end = new Date(endDate);
        }

        // Get stats by action
        const statsByAction = await SystemLog.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: start,
                        $lte: end,
                    },
                },
            },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 },
                },
            },
            {
                $sort: { count: -1 },
            },
        ]);

        // Get stats by level
        const statsByLevel = await SystemLog.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: start,
                        $lte: end,
                    },
                },
            },
            {
                $group: {
                    _id: '$level',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Get recent errors
        const recentErrors = await SystemLog.find({ level: 'error' })
            .limit(10)
            .sort({ createdAt: -1 })
            .populate('user', 'name email');

        res.status(200).json({
            success: true,
            data: {
                period: {
                    startDate: start,
                    endDate: end,
                },
                statsByAction,
                statsByLevel,
                recentErrors,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Create a log entry
// @route   POST /api/logs
// @access  Private
exports.createLog = async (req, res, next) => {
    try {
        const { action, details, level = 'info', metadata } = req.body;

        const log = await SystemLog.create({
            action,
            details,
            level,
            user: req.user._id,
            metadata: metadata || {},
        });

        res.status(201).json({
            success: true,
            message: 'Log created successfully',
            data: log,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete old logs
// @route   DELETE /api/logs/cleanup
// @access  Private/Admin
exports.cleanupLogs = async (req, res, next) => {
    try {
        const { days = 30 } = req.body;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const result = await SystemLog.deleteMany({
            createdAt: { $lt: cutoffDate },
        });

        // Log the cleanup action
        await SystemLog.create({
            action: 'INFO',
            details: `Logs cleaned up. Deleted ${result.deletedCount} logs older than ${days} days`,
            level: 'info',
            user: req.user._id,
        });

        res.status(200).json({
            success: true,
            message: 'Logs cleaned up successfully',
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Export logs
// @route   GET /api/logs/export
// @access  Private
exports.exportLogs = async (req, res, next) => {
    try {
        const { format = 'json', action, level } = req.query;

        let filter = {};
        if (action) {
            filter.action = action;
        }
        if (level) {
            filter.level = level;
        }

        const logs = await SystemLog.find(filter)
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        if (format === 'csv') {
            // Convert to CSV format
            let csv = 'Timestamp,Action,Level,User,Details\n';
            logs.forEach((log) => {
                csv += `"${log.createdAt}","${log.action}","${log.level}","${
                    log.user?.email || 'N/A'
                }","${log.details}"\n`;
            });

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="logs.csv"');
            res.send(csv);
        } else {
            // JSON format
            res.status(200).json({
                success: true,
                count: logs.length,
                data: logs,
            });
        }
    } catch (error) {
        next(error);
    }
};
