const mongoose = require('mongoose');

const binSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['metal', 'wet', 'dry'],
            required: true,
            unique: true,
        },
        capacity: {
            type: Number,
            default: 100,
            min: 1,
        },
        currentLevel: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        itemCount: {
            type: Number,
            default: 0,
        },
        lastEmptied: {
            type: Date,
            default: Date.now,
        },
        nextEmptyDue: {
            type: Date,
            default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        },
        status: {
            type: String,
            enum: ['operational', 'warning', 'critical', 'maintenance'],
            default: 'operational',
        },
        warningThreshold: {
            type: Number,
            default: 70, // Warn when 70% full
            min: 0,
            max: 100,
        },
        criticalThreshold: {
            type: Number,
            default: 90, // Critical when 90% full
            min: 0,
            max: 100,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        location: {
            type: String,
            default: '',
        },
        emptyCount: {
            type: Number,
            default: 0,
        },
        totalWeightStored: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Pre-save middleware to update status based on current level
binSchema.pre('save', function (next) {
    if (this.currentLevel >= this.criticalThreshold) {
        this.status = 'critical';
    } else if (this.currentLevel >= this.warningThreshold) {
        this.status = 'warning';
    } else {
        this.status = 'operational';
    }
    next();
});

// Method to empty the bin
binSchema.methods.empty = function () {
    this.currentLevel = 0;
    this.itemCount = 0;
    this.lastEmptied = new Date();
    this.emptyCount += 1;
    this.nextEmptyDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return this.save();
};

// Method to add waste to bin
binSchema.methods.addWaste = function (weight = 0.5) {
    this.currentLevel = Math.min(this.currentLevel + 5, 100);
    this.itemCount += 1;
    this.totalWeightStored += weight;
    return this.save();
};

module.exports = mongoose.model('Bin', binSchema);
