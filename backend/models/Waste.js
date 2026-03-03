const mongoose = require('mongoose');

const wasteSchema = new mongoose.Schema(
    {
        classification: {
            type: String,
            enum: ['metal', 'wet', 'dry'],
            required: [true, 'Please provide waste classification'],
        },
        confidence: {
            type: Number,
            min: 0,
            max: 100,
            required: true,
        },
        metalLevel: {
            type: Number,
            min: 0,
            max: 100,
            required: true,
        },
        moistureLevel: {
            type: Number,
            min: 0,
            max: 100,
            required: true,
        },
        temperature: {
            type: Number,
            required: true,
        },
        weight: {
            type: Number,
            default: 0.5,
        },
        servo_direction: {
            type: String,
            enum: ['metal', 'wet', 'dry'],
        },
        bin_level: {
            type: Number,
            default: 0,
        },
        processedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        processedAt: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ['success', 'failed', 'pending'],
            default: 'success',
        },
        metadata: {
            type: Map,
            of: String,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
wasteSchema.index({ classification: 1, createdAt: -1 });
wasteSchema.index({ processedBy: 1 });
wasteSchema.index({ processedAt: -1 });

// Static method to get statistics
wasteSchema.statics.getStatistics = async function (startDate, endDate) {
    const stats = await this.aggregate([
        {
            $match: {
                processedAt: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                },
            },
        },
        {
            $group: {
                _id: '$classification',
                count: { $sum: 1 },
                avgConfidence: { $avg: '$confidence' },
                totalWeight: { $sum: '$weight' },
            },
        },
    ]);
    return stats;
};

module.exports = mongoose.model('Waste', wasteSchema);
