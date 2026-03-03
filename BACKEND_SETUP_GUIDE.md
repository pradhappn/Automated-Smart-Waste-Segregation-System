# Backend Setup & Deployment Guide

## Quick Start

### Prerequisites
- Node.js 14+ installed
- npm 6+ installed
- MongoDB Atlas account (free)
- Internet connection

### 5-Minute Setup

1. **Create MongoDB Atlas Account** (if not done)
   - Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
   - Create free cluster
   - Get connection string

2. **Update .env File**
   ```bash
   cd backend
   cp .env.example .env
   ```
   
   Edit `.env` with your MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/waste-segregation
   JWT_SECRET=your-secure-secret-key-here
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Start Server**
   ```bash
   npm start
   ```

5. **Test Connection**
   - Open browser: `http://localhost:3000/health`
   - Should see: `{"success":true,"message":"Server is healthy"}`

---

## Complete Setup Guide

### Step 1: Environment Configuration

Create `.env` file in backend directory:

```bash
# backend/.env

# Server Configuration
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://username:password@cluster-name.mongodb.net/waste-segregation?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-very-secure-random-secret-key-change-this
JWT_EXPIRE=7d

# API Configuration
CORS_ORIGIN=*
API_PREFIX=/api

# Logging
LOG_LEVEL=debug
```

### Step 2: Install Dependencies

```bash
cd backend
npm install
```

This installs:
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **socket.io** - Real-time communication
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **cors** - Cross-origin support
- **body-parser** - Request parsing
- **dotenv** - Environment variables
- **nodemon** - Development auto-reload

### Step 3: Initialize Database

Run server once to initialize collections:

```bash
npm start
```

Or create collections manually in MongoDB Atlas console.

### Step 4: Create First User & Promote to Admin

There are **no built‑in admin credentials** shipped with the project; you create your own account and then make it an admin.  By default a new registration gets the `operator` role.

Register a user (choose any email/password you like):

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

You will receive a token and a user object.  At this point the `role` field will read `operator`.

#### Promote the account to admin

1. **Manually via Atlas/`mongosh`**:

   ```js
   db.users.updateOne({ email: 'admin@example.com' }, { $set: { role: 'admin' } });
   ```

2. **Or use the admin API** (requires an existing admin):

   ```bash
   curl -X POST http://localhost:3000/api/auth/create \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <existing-admin-token>" \
     -d '{ "name": "Admin User", "email": "admin@example.com", "password": "password123", "role": "admin" }'
   ```

Once the role is `admin` you can log in with the same email/password and use the system’s admin features (initialize bins, create other users, delete records, etc.).

> **Tip:** Store your email/password somewhere secure. They serve as the “ID and password” for admin login and there is no default account.


### Step 5: Initialize Bins (Optional)

Create default waste bins:

```bash
curl -X POST http://localhost:3000/api/bins/initialize \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Development

### Start Development Server

With auto-reload on file changes:

```bash
npm run dev
```

Requires nodemon (should be installed with npm install).

### File Structure Overview

```
backend/
├── config/
│   └── database.js                 # MongoDB connection
├── models/
│   ├── User.js                     # User authentication
│   ├── Waste.js                    # Waste records
│   ├── Bin.js                      # Bin management
│   └── SystemLog.js                # Audit logs
├── middleware/
│   ├── auth.js                     # JWT & roles
│   ├── errorHandler.js             # Error handling
│   └── validation.js               # Input validation
├── controllers/
│   ├── authController.js           # Auth logic
│   ├── wasteController.js          # Waste logic
│   ├── binController.js            # Bin logic
│   └── logsController.js           # Logging logic
├── routes/
│   ├── authRoutes.js               # /api/auth
│   ├── wasteRoutes.js              # /api/waste
│   ├── binRoutes.js                # /api/bins
│   └── logsRoutes.js               # /api/logs
├── server.js                       # Main app
├── package.json                    # Dependencies
└── .env                            # Configuration
```

### Key Files

| File | Purpose |
|------|---------|
| `server.js` | Application entry point |
| `config/database.js` | MongoDB connection setup |
| `models/*.js` | Data schemas (Mongoose) |
| `middleware/*.js` | Request processing |
| `controllers/*.js` | Business logic |
| `routes/*.js` | API endpoints |

---

## Database Initialization

### Automatic

Collections are created automatically when:
1. First user registers
2. First waste is processed
3. First log entry created

### Manual (MongoDB Atlas Console)

Create collections with these configurations:

**Users**
```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      required: ["name", "email", "password", "role"]
    }
  }
});
db.users.createIndex({ email: 1 }, { unique: true });
```

**Waste**
```javascript
db.waste.createIndex({ classification: 1, createdAt: -1 });
db.waste.createIndex({ processedBy: 1 });
db.waste.createIndex({ processedAt: -1 });
```

**Bins**
```javascript
db.bins.createIndex({ type: 1 }, { unique: true });
```

**SystemLogs**
```javascript
db.systemlogs.createIndex({ action: 1, createdAt: -1 });
db.systemlogs.createIndex({ user: 1, createdAt: -1 });
```

---

## API Testing

### Use Postman

1. Import collection from API_DOCUMENTATION.md
2. Create environment:
   ```
   baseUrl: http://localhost:3000
   token: <your_jwt_token>
   ```

### Use cURL

**Register User**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

**Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Process Waste** (with token)
```bash
curl -X POST http://localhost:3000/api/waste/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "metalLevel": 75,
    "moistureLevel": 45,
    "temperature": 28,
    "weight": 0.5
  }'
```

### Use REST Client (VS Code)

Create `test.http` file:

```http
### Health Check
GET http://localhost:3000/health

### Register User
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}

### Login
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123"
}

### Process Waste
POST http://localhost:3000/api/waste/process
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "metalLevel": 75,
  "moistureLevel": 45,
  "temperature": 28,
  "weight": 0.5
}
```

---

## Running Tests

### Setup Testing

```bash
npm install --save-dev jest supertest
```

### Test File Example

Create `waste.test.js`:

```javascript
const request = require('supertest');
const app = require('./server');
const Waste = require('./models/Waste');

describe('Waste API', () => {
  it('should process waste correctly', async () => {
    const res = await request(app)
      .post('/api/waste/process')
      .set('Authorization', 'Bearer token')
      .send({
        metalLevel: 75,
        moistureLevel: 45,
        temperature: 28
      });
    
    expect(res.status).toBe(201);
    expect(res.body.data.waste.classification).toBe('metal');
  });
});
```

### Run Tests

```bash
npm test
```

---

## Production Deployment

### Before Deploying

1. **Environment Variables**
   ```
   NODE_ENV=production
   JWT_SECRET=<long-random-string>
   MONGODB_URI=<production-mongodb-uri>
   CORS_ORIGIN=<your-domain>
   ```

2. **Security**
   - Change all default credentials
   - Enable HTTPS/SSL
   - Set secure CORS origins
   - Enable database encryption
   - Whitelist only production IP in MongoDB Atlas

3. **Testing**
   - Run all tests
   - Load test the server
   - Test database backups
   - Verify error handling

### Deployment Platforms

#### Heroku

```bash
# Create app
heroku create waste-segregation-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=<secret>
heroku config:set MONGODB_URI=<uri>

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### AWS (Elastic Beanstalk)

```bash
# Install EB CLI
pip install awsebcli --upgrade --user

# Initialize
eb init -p node.js-18 waste-segregation

# Create environment
eb create production

# Deploy changes
git commit -m "changes"
eb deploy

# View logs
eb logs
```

#### Railway

1. Connect GitHub repository
2. Add MongoDB Atlas URI as environment variable
3. Deploy from git push
4. Logs available in dashboard

#### Render

1. Create new Web Service
2. Connect GitHub
3. Set environment variables
4. Deploy

#### AWS EC2

```bash
# SSH into instance
ssh -i key.pem ec2-user@<ip>

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# Clone repository
git clone <repo>
cd waste-segregation/backend

# Install dependencies
npm install

# Create .env file
nano .env

# Start with PM2
npm install -g pm2
pm2 start server.js --name "waste-api"
pm2 startup
pm2 save

# Setup Nginx reverse proxy
sudo apt install nginx
# Configure Nginx to proxy to localhost:3000
sudo systemctl start nginx
```

---

## Monitoring & Maintenance

### Check Server Status

```bash
# Check if server is running
curl http://localhost:3000/health

# Check logs
tail -f logs/error.log
tail -f logs/access.log
```

### Database Maintenance

```bash
# MongoDB Atlas Dashboard
# Monitor:
# - Network connections
# - Operations rate
# - Storage usage
# - Query performance
```

### Common Issues

**Port Already in Use**
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

**MongoDB Connection Failed**
```
1. Check MongoDB URI in .env
2. Verify IP whitelisting in Atlas
3. Check credentials
4. Verify internet connection
5. Check firewall rules
```

**Out of Memory**
```
1. Increase Node.js heap size:
   NODE_OPTIONS=--max-old-space-size=4096 npm start

2. Optimize queries
3. Add pagination
4. Implement caching
```

---

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` or `production` |
| `MONGODB_URI` | Database connection | `mongodb+srv://user:pass@host/db` |
| `JWT_SECRET` | Token signing key | Long random string |
| `JWT_EXPIRE` | Token TTL | `7d` or `24h` |
| `CORS_ORIGIN` | Allowed origins | `*` or `https://example.com` |
| `API_PREFIX` | API path prefix | `/api` |
| `LOG_LEVEL` | Logging verbosity | `debug`, `info`, `warn`, `error` |

---

## Performance Tuning

### Database Optimization

```javascript
// Use projection
Waste.find({}, 'classification createdAt');

// Use lean for read queries
Waste.find().lean();

// Use pagination
const page = req.query.page || 1;
const limit = req.query.limit || 10;
const skip = (page - 1) * limit;
const data = await Waste.find().skip(skip).limit(limit);
```

### Server Optimization

```javascript
// Use compression
const compression = require('compression');
app.use(compression());

// Connection pooling is automatic with Mongoose

// Setup caching
const redis = require('redis');
const client = redis.createClient();
```

### WebSocket Optimization

```javascript
// Connection pooling
const io = socketIo(server, {
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});
```

---

## Backup & Recovery

### MongoDB Atlas Backups

1. Go to **Backup** in MongoDB Atlas
2. Create snapshot
3. Download or restore

### Application Backup

```bash
# Backup .env and source
tar -czf backup.tar.gz .env models/ controllers/ routes/ middleware/ config/

# Restore
tar -xzf backup.tar.gz
```

---

## Scaling Strategy

### Vertical Scaling (Increase resources)
- More RAM
- Better CPU
- Larger Node.js heap size

### Horizontal Scaling (Multiple servers)
1. **Load Balancer** - Nginx/HAProxy
2. **Session Store** - Redis (instead of in-memory)
3. **Message Queue** - Bull/RabbitMQ (for async jobs)
4. **Database** - MongoDB Atlas handles this

### Example Architecture
```
┌─────────────┐
│     LB      │
└──────┬──────┘
   ┌───┴────┬───────┬───────┐
   │        │       │       │
┌──▼───┐ ┌─▼──┐ ┌──▼──┐ ┌──▼──┐
│Node1 │ │Node│ │Node3│ │Node4│
│:3000 │ │2   │ │:3002│ │:3003│
│      │ │:3001
```

---

## Troubleshooting

### Server Won't Start

```bash
# Check Node.js version
node --version

# Check port availability
lsof -i :3000

# Check .env file exists
ls -la .env

# Check MongoDB connection
mongosh "mongodb+srv://..."
```

### Slow Queries

```bash
# Enable profiling in MongoDB
db.setProfilingLevel(1)

# Check profiles
db.system.profile.find().limit(5).pretty()

# Add indexes
db.waste.createIndex({ classification: 1, createdAt: -1 })
```

### Memory Leak

```bash
# Monitor memory usage
free -h

# Check for circular references
# Use Node.js debugger
node --inspect server.js

# Connect to chrome://inspect
```

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Start server
npm start

# Start with auto-reload
npm run dev

# Test API endpoints
curl http://localhost:3000/health

# View MongoDB data
mongosh "mongodb+srv://user:pass@host/db"

# Check ports
netstat -tlnp | grep NODE

# View running processes
ps aux | grep node

# Kill process
kill -9 <PID>
```

---

## Resources

- [Node.js Documentation](https://nodejs.org/docs)
- [Express.js Guide](https://expressjs.com)
- [Mongoose Documentation](https://mongoosejs.com)
- [MongoDB Atlas Guide](https://docs.atlas.mongodb.com)
- [JWT.io](https://jwt.io)
- [Socket.IO Documentation](https://socket.io/docs)

---

## Support

For issues:
1. Check logs: `npm start` (terminal output)
2. Check MongoDB Atlas dashboard
3. Verify .env configuration
4. Check API endpoints in API_DOCUMENTATION.md

---

**Backend Status**: ✅ Ready for Development & Production

**Next Steps**:
1. Set up MongoDB Atlas account
2. Configure .env file
3. Run `npm install`
4. Start server with `npm start`
5. Test API endpoints
6. Deploy to production server

🚀 Happy coding!
