const mongoose = require('mongoose');

const systemLogSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            enum: [
                'WASTE_PROCESSED',
                'BIN_EMPTIED',
                'BIN_FULL',
                'USER_LOGIN',
                'USER_LOGOUT',
                'USER_CREATED',
                'SYSTEM_START',
                'SIMULATION_START',
                'SIMULATION_STOP',
                'ERROR',
                'WARNING',
                'INFO',
            ],
            required: true,
        },
        details: {
            type: String,
            required: true,
        },
        level: {
            type: String,
            enum: ['info', 'warning', 'error'],
            default: 'info',
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        ipAddress: {
            type: String,
            default: '0.0.0.0',
        },
        relatedData: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'relatedModel',
        },
        relatedModel: {
            type: String,
            enum: ['Waste', 'Bin', 'User'],
            default: null,
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
systemLogSchema.index({ action: 1, createdAt: -1 });
systemLogSchema.index({ user: 1, createdAt: -1 });
systemLogSchema.index({ level: 1 });

module.exports = mongoose.model('SystemLog', systemLogSchema);
