const Waste = require('../models/Waste');
const Bin = require('../models/Bin');
const SystemLog = require('../models/SystemLog');

// Helper function to classify waste
const classifyWaste = (metalLevel, moistureLevel, temperature) => {
    let classification = 'dry';
    let confidence = 0;

    if (metalLevel > 70) {
        classification = 'metal';
        confidence = Math.min(100, metalLevel + 10);
    } else if (moistureLevel > 60) {
        classification = 'wet';
        confidence = Math.min(100, moistureLevel + 10);
    } else {
        classification = 'dry';
        confidence = Math.min(100, 100 - (metalLevel + moistureLevel) / 2);
    }

    return { classification, confidence };
};

// @desc    Process waste
// @route   POST /api/waste/process
// @access  Private
exports.processWaste = async (req, res, next) => {
    try {
        const { metalLevel, moistureLevel, temperature, weight } = req.body;

        // Classify waste
        const { classification, confidence } = classifyWaste(metalLevel, moistureLevel, temperature || 25);

        // Get the corresponding bin
        let bin = await Bin.findOne({ type: classification });

        if (!bin) {
            // Create bin if it doesn't exist
            bin = await Bin.create({
                type: classification,
                capacity: 100,
            });
        }

        // Add waste to bin
        await bin.addWaste(weight || 0.5);

        // Create waste record
        const waste = await Waste.create({
            classification,
            confidence,
            metalLevel,
            moistureLevel,
            temperature: temperature || 25,
            weight: weight || 0.5,
            servo_direction: classification,
            bin_level: bin.currentLevel,
            processedBy: req.user ? req.user._id : null,
            status: 'success',
        });

        // Log the action
        await SystemLog.create({
            action: 'WASTE_PROCESSED',
            details: `Waste classified as ${classification} with ${confidence}% confidence`,
            level: 'info',
            user: req.user ? req.user._id : null,
            relatedData: waste._id,
            relatedModel: 'Waste',
        });

        res.status(201).json({
            success: true,
            message: 'Waste processed successfully',
            data: {
                waste,
                bin: {
                    type: bin.type,
                    currentLevel: bin.currentLevel,
                    status: bin.status,
                    itemCount: bin.itemCount,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get all waste records
// @route   GET /api/waste
// @access  Private
exports.getWaste = async (req, res, next) => {
    try {
        const { classification, page = 1, limit = 10 } = req.query;

        const skip = (page - 1) * limit;

        let filter = {};
        if (classification) {
            filter.classification = classification;
        }

        const waste = await Waste.find(filter)
            .populate('processedBy', 'name email')
            .limit(parseInt(limit))
            .skip(skip)
            .sort({ createdAt: -1 });

        const total = await Waste.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: waste.length,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            data: waste,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get waste by ID
// @route   GET /api/waste/:id
// @access  Private
exports.getWasteById = async (req, res, next) => {
    try {
        const waste = await Waste.findById(req.params.id).populate('processedBy', 'name email');

        if (!waste) {
            return res.status(404).json({
                success: false,
                message: 'Waste record not found',
            });
        }

        res.status(200).json({
            success: true,
            data: waste,
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Get waste statistics
// @route   GET /api/waste/statistics
// @access  Private
exports.getWasteStatistics = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        let start = new Date();
        start.setDate(start.getDate() - 30); // Default to last 30 days

        let end = new Date();

        if (startDate) {
            start = new Date(startDate);
        }
        if (endDate) {
            end = new Date(endDate);
        }

        const stats = await Waste.getStatistics(start, end);

        // Get total counts by classification
        const totalByType = await Waste.aggregate([
            {
                $group: {
                    _id: '$classification',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Get overall stats
        const totalWaste = await Waste.countDocuments();
        const avgConfidence = await Waste.aggregate([
            {
                $group: {
                    _id: null,
                    avgConfidence: { $avg: '$confidence' },
                    totalWeight: { $sum: '$weight' },
                },
            },
        ]);

        res.status(200).json({
            success: true,
            data: {
                period: {
                    startDate: start,
                    endDate: end,
                },
                statistics: stats,
                totalByType: totalByType,
                overall: {
                    totalWaste,
                    avgConfidence: avgConfidence[0]?.avgConfidence || 0,
                    totalWeight: avgConfidence[0]?.totalWeight || 0,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// @desc    Delete waste record
// @route   DELETE /api/waste/:id
// @access  Private/Admin
exports.deleteWaste = async (req, res, next) => {
    try {
        const waste = await Waste.findByIdAndDelete(req.params.id);

        if (!waste) {
            return res.status(404).json({
                success: false,
                message: 'Waste record not found',
            });
        }

        // Log the action
        await SystemLog.create({
            action: 'WASTE_DELETED',
            details: `Waste record deleted: ${waste.classification}`,
            level: 'info',
            user: req.user._id,
            relatedData: waste._id,
            relatedModel: 'Waste',
        });

        res.status(200).json({
            success: true,
            message: 'Waste record deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};
