# Backend Architecture Guide

## Project Structure

Complete backend architecture for Waste Segregation System with MongoDB Atlas integration.

```
backend/
├── config/
│   └── database.js                 # MongoDB connection
├── models/
│   ├── User.js                     # User schema
│   ├── Waste.js                    # Waste processing records
│   ├── Bin.js                      # Waste bins
│   └── SystemLog.js                # System audit logs
├── middleware/
│   ├── auth.js                     # JWT authentication & authorization
│   ├── errorHandler.js             # Error handling
│   └── validation.js               # Input validation
├── controllers/
│   ├── authController.js           # User authentication logic
│   ├── wasteController.js          # Waste processing logic
│   ├── binController.js            # Bin management logic
│   └── logsController.js           # Logging logic
├── routes/
│   ├── authRoutes.js               # Auth endpoints
│   ├── wasteRoutes.js              # Waste endpoints
│   ├── binRoutes.js                # Bin endpoints
│   └── logsRoutes.js               # Logs endpoints
├── server.js                       # Main server file
├── package.json                    # Dependencies
├── .env                            # Environment variables (local)
├── .env.example                    # Environment template
└── .gitignore                      # Git ignore rules
```

---

## Architecture Layers

### 1. Config Layer (`config/`)
**Purpose**: Database and external service configuration

**Files**:
- `database.js` - MongoDB Atlas connection setup

**Responsibilities**:
- Connect to MongoDB Atlas
- Handle connection errors
- Configure connection options
- Validate database URL

---

### 2. Models Layer (`models/`)
**Purpose**: Define data schemas using Mongoose

**Files**:
- `User.js` - User schema with password hashing
- `Waste.js` - Waste processing records
- `Bin.js` - Waste bin inventory
- `SystemLog.js` - Audit logging

**Responsibilities**:
- Define data structures
- Implement validation rules
- Create indexes for performance
- Implement static methods for aggregation
- Implement instance methods for operations

**Example - User Model**:
```javascript
- name (String, required)
- email (String, unique, required)
- password (String, hashed)
- role (String: admin/operator/analyst)
- isActive (Boolean)
- lastLogin (Date)
- timestamps (createdAt, updatedAt)
- Methods: matchPassword()
```

---

### 3. Middleware Layer (`middleware/`)
**Purpose**: Process requests and handle cross-cutting concerns

**Files**:
- `auth.js` - JWT authentication & role-based authorization
- `errorHandler.js` - Global error handling
- `validation.js` - Input validation

**Request Flow**:
```
Request
   ↓
cors, bodyParser (Express built-in)
   ↓
authentication (if required)
   ↓
authorization (if required)
   ↓
validation (if required)
   ↓
controller
   ↓
errorHandler (if error)
   ↓
Response
```

**Key Middleware**:

1. **auth.js**
   - `protect` - Verify JWT token
   - `authorize(roles)` - Check user role
   - `optionalProtect` - Optional authentication

2. **errorHandler.js**
   - Catch and format errors
   - Handle MongoDB errors
   - Handle JWT errors
   - Handle validation errors

3. **validation.js**
   - Validate waste data
   - Validate user registration
   - Validate user login
   - Validate pagination

---

### 4. Controllers Layer (`controllers/`)
**Purpose**: Implement business logic

**Files**:
- `authController.js` - User authentication
- `wasteController.js` - Waste processing
- `binController.js` - Bin management
- `logsController.js` - System logging

**Naming Convention**:
- `register()` - Create user
- `login()` - Authenticate user
- `processWaste()` - Classify and route waste
- `getWaste()` - Retrieve waste records
- `emptyBin()` - Empty waste bin
- `getLogs()` - Retrieve logs

**Controller Structure**:
```javascript
exports.controllerFunction = async (req, res, next) => {
    try {
        // Business logic
        const data = await Model.operation();
        
        // Response
        res.status(200).json({
            success: true,
            message: 'Operation successful',
            data
        });
    } catch (error) {
        next(error); // Pass to error handler
    }
};
```

---

### 5. Routes Layer (`routes/`)
**Purpose**: Map HTTP requests to controllers

**Files**:
- `authRoutes.js` - Authentication endpoints
- `wasteRoutes.js` - Waste processing endpoints
- `binRoutes.js` - Bin management endpoints
- `logsRoutes.js` - Logging endpoints

**Route Structure**:
```javascript
// Public route
router.post('/register', validateUserRegistration, register);

// Protected route
router.get('/me', protect, getMe);

// Admin-only route
router.delete('/:id', protect, authorize('admin'), deleteWaste);
```

**Route Pattern**:
```
POST /api/auth/register             - Public
POST /api/auth/login                - Public
GET  /api/auth/me                   - Private
PUT  /api/auth/profile              - Private
POST /api/waste/process             - Private
GET  /api/waste                     - Private
POST /api/bins/:type/empty          - Private
GET  /api/logs                      - Private
DELETE /api/logs/cleanup            - Private/Admin
```

---

### 6. Application Layer (`server.js`)
**Purpose**: Initialize and run the Express server

**Responsibilities**:
- Load environment variables
- Connect to database
- Initialize middleware
- Register routes
- Setup WebSocket
- Start HTTP server

**Initialization Order**:
```javascript
1. Load .env
2. Create Express app
3. Connect MongoDB
4. Setup middleware (CORS, body-parser, etc.)
5. Mount routes
6. Setup error handlers
7. Start server
```

---

## Data Flow Example

### Waste Processing Flow

```
1. Frontend sends request
   POST /api/waste/process
   {
     metalLevel: 75,
     moistureLevel: 45,
     temperature: 28
   }

2. Middleware chain
   - CORS checks ✓
   - Body parser ✓
   - Auth middleware checks JWT ✓
   - Validation middleware checks data types ✓

3. Route routing
   - Match to: router.post('/process', validateWasteData, processWaste)

4. Controller execution (wasteController.js)
   - classifyWaste(75, 45, 28) → metal, 85% confidence
   - Find or create metal bin
   - Add waste to bin: bin.addWaste(0.5)
   - Create Waste document in MongoDB
   - Create SystemLog entry

5. WebSocket broadcast
   - io.emit('waste-simulated', wasteData)
   - All connected clients receive update

6. Response sent
   {
     success: true,
     data: {
       waste: { ... },
       bin: { ... }
     }
   }

7. Frontend updates UI
   - Activity feed updated
   - Bin visualizations updated
   - Statistics recalculated
```

---

## Database Schema Design

### Collections

#### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed with bcrypt),
  role: String (admin/operator/analyst),
  isActive: Boolean,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- email (unique)
```

#### Waste Collection
```javascript
{
  _id: ObjectId,
  classification: String (metal/wet/dry),
  confidence: Number (0-100),
  metalLevel: Number (0-100),
  moistureLevel: Number (0-100),
  temperature: Number,
  weight: Number,
  servo_direction: String,
  bin_level: Number,
  processedBy: ObjectId (ref: User),
  processedAt: Date,
  status: String (success/failed/pending),
  metadata: Map,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- classification, createdAt DESC
- processedBy
- processedAt DESC
```

#### Bins Collection
```javascript
{
  _id: ObjectId,
  type: String (metal/wet/dry, unique),
  capacity: Number,
  currentLevel: Number (0-100),
  itemCount: Number,
  lastEmptied: Date,
  nextEmptyDue: Date,
  status: String (operational/warning/critical),
  warningThreshold: Number,
  criticalThreshold: Number,
  isActive: Boolean,
  location: String,
  emptyCount: Number,
  totalWeightStored: Number,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- type (unique)
```

#### SystemLogs Collection
```javascript
{
  _id: ObjectId,
  action: String,
  details: String,
  level: String (info/warning/error),
  user: ObjectId (ref: User),
  ipAddress: String,
  relatedData: ObjectId,
  relatedModel: String (Waste/Bin/User),
  metadata: Map,
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- action, createdAt DESC
- user, createdAt DESC
- level
```

---

## Authentication Flow

### JWT Implementation

```javascript
// 1. User Registration/Login
{
  email: 'user@example.com',
  password: 'password123'
}
    ↓
// 2. Password hashed with bcrypt

const salt = await bcrypt.genSalt(10);
this.password = await bcrypt.hash(password, salt);

    ↓
// 3. JWT Token created

const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

    ↓
// 4. Token returned to frontend

{
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}

    ↓
// 5. Frontend stores token

localStorage.setItem('token', token);

    ↓
// 6. Token sent with each request

header: {
  Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}

    ↓
// 7. Backend verifies token

jwt.verify(token, JWT_SECRET);

    ↓
// 8. Request proceeds with user context

req.user = { _id: '...', email: '...', role: 'operator' }
```

---

## Error Handling Strategy

### Error Hierarchy

```
Exception
├── ValidationError
│   ├── Input validation failed
│   └── Database validation failed
├── AuthenticationError
│   ├── Invalid credentials
│   └── Token expired
├── AuthorizationError
│   └── Insufficient permissions
├── NotFoundError
│   └── Resource not found
├── MongooseError
│   ├── CastError
│   ├── ValidationError
│   └── Duplicate key (11000)
└── ServerError
    └── Unexpected errors
```

### Error Response Format

```javascript
{
  success: false,
  message: 'User-friendly error message',
  ...(development && { error: errorObject })
}
```

---

## Security Features

### 1. Password Security
- Hashed with bcrypt (saltRounds: 10)
- Never returned in responses
- Compared securely (matchPassword method)

### 2. JWT Token Security
- Signed with secret key
- Expiration time (default: 7 days)
- Verified on every protected request
- Not stored in database (stateless)

### 3. Input Validation
- Type checking
- Range validation
- Email validation
- Length limits

### 4. Authorization
- Role-based access control
- Three roles: admin, operator, analyst
- Role checking middleware

### 5. MongoDB Security
- Connection with TLS
- IP whitelist via Atlas
- Database user with limited permissions
- Password never in code (environment variable)

---

## Environment Variables

```
# Server
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d

# API
CORS_ORIGIN=*
API_PREFIX=/api
```

---

## API Versioning

Current: **v1** (implicit in `/api` prefix)

Future versioning strategy:
```
/api/v1/waste
/api/v2/waste
```

---

## WebSocket Integration

### Real-time Features

```javascript
// Server broadcasts
io.on('connection', (socket) => {
    socket.emit('initial-data', data);
    socket.on('start-simulation', () => {
        // Auto-generate sensor data
    });
});

// Frontend listens
socket.on('waste-simulated', (data) => {
    // Update UI
});
```

---

## Performance Optimization

### Database Indexes
```javascript
// Waste
- classification + createdAt (for filtering)
- processedBy (for user-specific queries)
- processedAt (for time-based queries)

// Logs
- action + createdAt
- user + createdAt
- level
```

### Query Optimization
```javascript
// Use projections (select specific fields)
User.find().select('name email role');

// Use populate efficiently
Waste.find().populate('processedBy', 'name email');

// Limit results
const limit = Math.min(limit, 100);
```

---

## Scalability Considerations

### Current Architecture
- Single Node.js server
- In-memory WebSocket connections
- MongoDB Atlas (cloud, auto-scaling)

### Future Improvements
1. **Load Balancing** - Multiple Node.js instances
2. **Session Store** - Redis for session management
3. **Message Queue** - Bull/RabbitMQ for async tasks
4. **Caching** - Redis for frequently accessed data
5. **CDN** - For static assets
6. **Database Sharding** - For large datasets
7. **Microservices** - Separate services for different domains

---

## Dependencies

```json
{
  "express": "^4.22.1",           // Web framework
  "mongoose": "^9.2.3",           // MongoDB ODM
  "socket.io": "^4.5.4",          // Real-time communication
  "jsonwebtoken": "^9.0.3",       // JWT authentication
  "bcryptjs": "^3.0.3",           // Password hashing
  "cors": "^2.8.6",               // CORS middleware
  "body-parser": "^1.20.2",       // Request parsing
  "dotenv": "^16.6.1"             // Environment variables
}
```

---

## Testing Strategy

### Unit Tests (With Jest)
```javascript
// Controllers
describe('wasteController', () => {
    test('processWaste should classify metal correctly', () => { ... });
});

// Models
describe('Waste model', () => {
    test('getStatistics should aggregate data', () => { ... });
});

// Middleware
describe('auth middleware', () => {
    test('protect should verify JWT', () => { ... });
});
```

### Integration Tests
```javascript
// API endpoints
describe('POST /api/waste/process', () => {
    test('should create waste record and update bin', () => { ... });
});
```

### E2E Tests
```javascript
// Full workflows
describe('Waste segregation flow', () => {
    test('User -> Register -> Login -> Process Waste', () => { ... });
});
```

---

## Deployment Checklist

### Before Deployment
- [ ] Update JWT_SECRET to production value
- [ ] Set NODE_ENV=production
- [ ] Configure MongoDB user with minimal permissions
- [ ] Whitelist only production server IP in Atlas
- [ ] Enable HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Set up logging and monitoring
- [ ] Test all endpoints
- [ ] Load testing
- [ ] Security audit

### Deployment Steps
1. Deploy to hosting provider (Heroku, AWS, Azure, etc.)
2. Set environment variables
3. Run database migrations (if needed)
4. Initialize bins collection
5. Monitor logs and metrics
6. Set up backups
7. Configure monitoring alerts

---

## Monitoring & Logging

### Application Logs
```
[timestamp] [level] [module] message
2026-03-01T10:30:00Z [INFO] server Connected to MongoDB
2026-03-01T10:30:05Z [INFO] waste Waste processed successfully
2026-03-01T10:35:00Z [ERROR] auth Invalid token
```

### Database Logs (MongoDB Atlas)
- Connection monitoring
- Query performance
- Storage usage
- Backup status

### Metrics to Monitor
- Request volume
- Response times
- Error rates
- Database operations
- WebSocket connections
- CPU/Memory usage

---

## Conclusion

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Scalable structure
- ✅ Security best practices
- ✅ Error handling
- ✅ Real-time capabilities
- ✅ MongoDB Atlas integration
- ✅ JWT authentication
- ✅ Role-based authorization

**Ready for production!** 🚀
