require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Import database connection
const connectDB = require('./config/database');

// Import models
const Waste = require('./models/Waste');
const Bin = require('./models/Bin');
const SystemLog = require('./models/SystemLog');

// Import routes
const authRoutes = require('./routes/authRoutes');
const wasteRoutes = require('./routes/wasteRoutes');
const binRoutes = require('./routes/binRoutes');
const logsRoutes = require('./routes/logsRoutes');

// Import middleware
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
}));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Favicon handler
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// API Routes
const apiPrefix = process.env.API_PREFIX || '/api';

app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/waste`, wasteRoutes);
app.use(`${apiPrefix}/bins`, binRoutes);
app.use(`${apiPrefix}/logs`, logsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
    });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// WebSocket Connection
io.on('connection', async (socket) => {
    console.log('✅ New client connected:', socket.id);

    try {
        // Send initial data
        const bins = await Bin.find();
        const wasteCount = await Waste.countDocuments();

        socket.emit('initial-data', {
            bins: bins.map((b) => ({
                type: b.type,
                capacity: b.capacity,
                currentLevel: b.currentLevel,
                status: b.status,
            })),
            statistics: {
                totalWaste: wasteCount,
                efficiency: 85,
            },
        });
    } catch (error) {
        console.error('❌ Error sending initial data:', error);
    }

    // Simulate sensor data
    let simulationInterval = null;

    socket.on('start-simulation', () => {
        console.log('🔄 Starting simulation for client:', socket.id);

        simulationInterval = setInterval(async () => {
            try {
                const metalLevel = Math.random() * 100;
                const moistureLevel = Math.random() * 100;
                const temperature = 20 + Math.random() * 15;

                // Classify waste
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

                // Get or create bin
                let bin = await Bin.findOne({ type: classification });
                if (!bin) {
                    bin = await Bin.create({ type: classification });
                }

                // Add waste to bin
                await bin.addWaste(0.5);

                // Create waste record
                const waste = await Waste.create({
                    classification,
                    confidence,
                    metalLevel,
                    moistureLevel,
                    temperature,
                    weight: 0.5 + Math.random(),
                    servo_direction: classification,
                    bin_level: bin.currentLevel,
                    status: 'success',
                });

                // Broadcast to all clients
                io.emit('waste-simulated', {
                    id: waste._id,
                    classification,
                    confidence,
                    metalLevel,
                    moistureLevel,
                    temperature,
                    timestamp: waste.createdAt,
                    binLevels: {
                        metal: (await Bin.findOne({ type: 'metal' }))?.currentLevel || 0,
                        wet: (await Bin.findOne({ type: 'wet' }))?.currentLevel || 0,
                        dry: (await Bin.findOne({ type: 'dry' }))?.currentLevel || 0,
                    },
                });
            } catch (error) {
                console.error('❌ Error in simulation:', error);
            }
        }, 5000);
    });

    socket.on('stop-simulation', () => {
        console.log('⏹️  Stopping simulation for client:', socket.id);
        if (simulationInterval) {
            clearInterval(simulationInterval);
            simulationInterval = null;
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected:', socket.id);
        if (simulationInterval) {
            clearInterval(simulationInterval);
        }
    });
});

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API Prefix: ${process.env.API_PREFIX || '/api'}`);
    console.log(`🌍 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`${'='.repeat(50)}\n`);
});
