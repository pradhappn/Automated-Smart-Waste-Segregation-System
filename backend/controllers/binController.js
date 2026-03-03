const Bin = require('../models/Bin');
const SystemLog = require('../models/SystemLog');

// @desc    Get all bins
// @route   GET /api/bins
// @access  Private
exports.getBins = async (req, res, next) => {
    try {
        const bins = await Bin.find().sort({ type: 1 });

        res.status(200).json({
            success: true,
            count: bins.length,
            data: bins,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get specific bin
// @route   GET /api/bins/:type
// @access  Private
exports.getBinByType = async (req, res, next) => {
    try {
        const { type } = req.params;

        if (!['metal', 'wet', 'dry'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid bin type. Must be metal, wet, or dry',
            });
        }

        const bin = await Bin.findOne({ type });

        if (!bin) {
            return res.status(404).json({
                success: false,
                message: `${type} bin not found`,
            });
        }

        res.status(200).json({
            success: true,
            data: bin,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Empty a bin
// @route   POST /api/bins/:type/empty
// @access  Private
exports.emptyBin = async (req, res, next) => {
    try {
        const { type } = req.params;

        if (!['metal', 'wet', 'dry'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid bin type. Must be metal, wet, or dry',
            });
        }

        let bin = await Bin.findOne({ type });

        if (!bin) {
            // Create bin if it doesn't exist
            bin = await Bin.create({
                type,
                capacity: 100,
            });
        }

        const previousLevel = bin.currentLevel;

        // Empty the bin
        await bin.empty();

        // Log the action
        await SystemLog.create({
            action: 'BIN_EMPTIED',
            details: `${type} bin emptied (was ${previousLevel}% full)`,
            level: 'info',
            user: req.user._id,
            relatedData: bin._id,
            relatedModel: 'Bin',
        });

        res.status(200).json({
            success: true,
            message: `${type} bin emptied successfully`,
            data: {
                type: bin.type,
                currentLevel: bin.currentLevel,
                previousLevel,
                lastEmptied: bin.lastEmptied,
                emptyCount: bin.emptyCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Update bin capacity
// @route   PUT /api/bins/:type
// @access  Private/Admin
exports.updateBin = async (req, res, next) => {
    try {
        const { type } = req.params;
        const { capacity, warningThreshold, criticalThreshold, location } = req.body;

        if (!['metal', 'wet', 'dry'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid bin type. Must be metal, wet, or dry',
            });
        }

        let bin = await Bin.findOne({ type });

        if (!bin) {
            return res.status(404).json({
                success: false,
                message: `${type} bin not found`,
            });
        }

        // Update fields
        if (capacity) bin.capacity = capacity;
        if (warningThreshold) bin.warningThreshold = warningThreshold;
        if (criticalThreshold) bin.criticalThreshold = criticalThreshold;
        if (location) bin.location = location;

        await bin.save();

        res.status(200).json({
            success: true,
            message: 'Bin updated successfully',
            data: bin,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get bin statistics
// @route   GET /api/bins/statistics
// @access  Private
exports.getBinStatistics = async (req, res, next) => {
    try {
        const bins = await Bin.find();

        const statistics = {
            totalBins: bins.length,
            bins: bins.map((bin) => ({
                type: bin.type,
                currentLevel: bin.currentLevel,
                capacity: bin.capacity,
                percentage: Math.round((bin.currentLevel / bin.capacity) * 100),
                status: bin.status,
                itemCount: bin.itemCount,
                emptyCount: bin.emptyCount,
                totalWeightStored: bin.totalWeightStored,
                lastEmptied: bin.lastEmptied,
            })),
            averageLevel: Math.round(
                bins.reduce((sum, bin) => sum + bin.currentLevel, 0) / bins.length
            ),
            criticalBins: bins.filter((bin) => bin.status === 'critical').length,
            warningBins: bins.filter((bin) => bin.status === 'warning').length,
        };

        res.status(200).json({
            success: true,
            data: statistics,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Check all bins and emit alerts
// @route   GET /api/bins/check-status
// @access  Private
exports.checkBinStatus = async (req, res, next) => {
    try {
        const bins = await Bin.find();

        const alerts = [];

        for (const bin of bins) {
            if (bin.status === 'critical') {
                alerts.push({
                    type: bin.type,
                    status: 'CRITICAL',
                    message: `${bin.type} bin is at critical level (${bin.currentLevel}%)`,
                    level: 'critical',
                });

                // Log critical alert
                await SystemLog.create({
                    action: 'BIN_FULL',
                    details: `${bin.type} bin at critical level (${bin.currentLevel}%)`,
                    level: 'error',
                    user: req.user ? req.user._id : null,
                    relatedData: bin._id,
                    relatedModel: 'Bin',
                });
            } else if (bin.status === 'warning') {
                alerts.push({
                    type: bin.type,
                    status: 'WARNING',
                    message: `${bin.type} bin is at warning level (${bin.currentLevel}%)`,
                    level: 'warning',
                });
            }
        }

        res.status(200).json({
            success: true,
            alerts,
            hasAlerts: alerts.length > 0,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Initialize bins (create if not exist)
// @route   POST /api/bins/initialize
// @access  Private/Admin
exports.initializeBins = async (req, res, next) => {
    try {
        const binTypes = ['metal', 'wet', 'dry'];
        const createdBins = [];

        for (const type of binTypes) {
            let bin = await Bin.findOne({ type });

            if (!bin) {
                bin = await Bin.create({
                    type,
                    capacity: 100,
                    currentLevel: 0,
                    itemCount: 0,
                });
                createdBins.push(bin);
            }
        }

        // Log the action
        if (createdBins.length > 0) {
            await SystemLog.create({
                action: 'INFO',
                details: `Bins initialized. Created ${createdBins.length} new bins`,
                level: 'info',
                user: req.user._id,
            });
        }

        res.status(200).json({
            success: true,
            message: 'Bins initialized successfully',
            createdCount: createdBins.length,
            data: createdBins,
        });
    } catch (error) {
        next(error);
    }
};
