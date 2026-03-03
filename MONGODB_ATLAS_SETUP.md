# MongoDB Atlas Setup Guide

## Overview

This guide will help you set up MongoDB Atlas (cloud database) for the Automated Smart Waste Segregation System.

---

## Step-by-Step Setup

### Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Try Free"
3. Sign up with email, Google, or GitHub account
4. Verify your email address
5. Accept terms and create account

### Step 2: Create a Project

1. Once logged in, click "Create a Project"
2. Enter project name: `waste-segregation` (or your preferred name)
3. Click "Next"
4. Skip adding project members (can do later)
5. Click "Create Project"

### Step 3: Create a Cluster

1. Click "Create a Cluster"
2. Choose **Free tier** (M0) for development
3. Select **Cloud Provider**: AWS (or Azure/Google Cloud)
4. Select **Region**: Choose closest to you
5. Leave other settings as default
6. Click "Create Cluster"
7. Wait for cluster to be created (5-10 minutes)

### Step 4: Create a Database User

1. Go to **Security** → **Database Access**
2. Click "Add New Database User"
3. **Authentication Method**: Choose "Password"
4. **Username**: Enter username (e.g., `admin`)
5. **Password**: Enter strong password or auto-generate
6. **Database User Privileges**: Select "Built-in Role: Atlas admin"
7. Copy the username and password (you'll need this!)
8. Click "Add User"

**⚠️ Important**: Save your username and password securely!

### Step 5: Whitelist IP Address

1. Go to **Security** → **Network Access**
2. Click "Add IP Address"
3. Click "Add Current IP Address" OR
4. Enter `0.0.0.0/0` to allow any IP (not recommended for production)
5. Click "Confirm"

### Step 6: Get Connection String

1. Go back to **Clusters** tab
2. Click "Connect" on your cluster
3. Choose "Connect to your application"
4. Select **Driver**: Node.js
5. Select **Version**: Latest
6. Copy the connection string

Example format:
```
mongodb+srv://username:password@clustername.xxxxx.mongodb.net/dbname?retryWrites=true&w=majority
```

### Step 7: Update .env File

1. Open `backend/.env` file
2. Replace `MONGODB_URI` value with your connection string
3. Replace `username` and `password` with your database credentials
4. Replace `cluster-name` with your actual cluster name

Example:
```
MONGODB_URI=mongodb+srv://admin:MySecurePassword123@wastecluster.uqod1.mongodb.net/waste-segregation?retryWrites=true&w=majority
```

### Step 8: Create Database and Collections (Optional)

The application will create collections automatically when you first use them. But if you want to create them manually:

1. Go to **Collections** in your cluster
2. Click "Create Database"
3. **Database Name**: `waste-segregation`
4. Collections will be created automatically

---

## Database Structure

The system automatically creates these collections:

### Users Collection
```javascript
{
  name: String,
  email: String,
  password: String (hashed),
  role: String (admin/operator/analyst),
  isActive: Boolean,
  lastLogin: Date,
  timestamps: true
}
```

### Waste Collection
```javascript
{
  classification: String,
  confidence: Number,
  metalLevel: Number,
  moistureLevel: Number,
  temperature: Number,
  weight: Number,
  servo_direction: String,
  bin_level: Number,
  processedBy: ObjectId (ref: User),
  processedAt: Date,
  status: String,
  metadata: Map,
  timestamps: true
}
```

### Bins Collection
```javascript
{
  type: String,
  capacity: Number,
  currentLevel: Number,
  itemCount: Number,
  lastEmptied: Date,
  nextEmptyDue: Date,
  status: String,
  isActive: Boolean,
  emptyCount: Number,
  totalWeightStored: Number,
  timestamps: true
}
```

### SystemLogs Collection
```javascript
{
  action: String,
  details: String,
  level: String,
  user: ObjectId (ref: User),
  ipAddress: String,
  relatedData: ObjectId,
  relatedModel: String,
  metadata: Map,
  timestamps: true
}
```

---

## Verify Connection

### Test Connection in Terminal

1. Navigate to backend folder:
   ```bash
   cd backend
   ```

2. Run the server:
   ```bash
   npm start
   ```

3. Check for output:
   ```
   ✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
   📊 Database: waste-segregation
   ```

### Test via Compass (Optional)

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Paste your connection string
3. Click "Connect"
4. Browse your databases and collections

### Test via API

1. Start your server (`npm start`)
2. Open browser to: `http://localhost:3000/health`
3. Should see: `{"success":true,"message":"Server is healthy"}`

4. Try registering a user:
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

---

## Connection String Components

Understanding your connection string:

```
mongodb+srv://username:password@cluster.xxxxx.mongodb.net/database?retryWrites=true&w=majority
                 ↓         ↓        ↓      ↓         ↓
              Your    Your    Cluster  Region   Database
             Creds    Pass     Name    Suffix    Name
```

---

## Environment Variables

Required fields in `.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.xxx.mongodb.net/db` |
| `JWT_SECRET` | Secret for JWT tokens | Any random string |
| `JWT_EXPIRE` | Token expiration time | `7d` |
| `PORT` | Server port | `3000` |
| `CORS_ORIGIN` | Allowed CORS origins | `*` or specific domain |

---

## Troubleshooting

### Connection Failed Error

**Problem**: `MongoServerSelectionError: connect ENOTFOUND`

**Solutions**:
1. Check if MongoDB URI is correct in `.env`
2. Verify IP address is whitelisted in Network Access
3. Check if username and password are correct
4. Ensure cluster is created and running
5. Try pinging the cluster: Check in MongoDB Atlas console

### Authentication Error

**Problem**: `MongoAuthenticationError: authentication failed`

**Solutions**:
1. Verify username and password are correct
2. Special characters in password must be URL encoded
   - `@` → `%40`
   - `#` → `%23`
   - Example: `pass@word!` → `pass%40word%21`
3. Check if user exists in Database Users

### Timeout Error

**Problem**: `MongooseError: operation timed out`

**Solutions**:
1. Check internet connection
2. Verify firewall isn't blocking MongoDB
3. Check if cluster is running (not paused)
4. Try different region for cluster
5. Check MongoDB status: [status.mongodb.com](https://status.mongodb.com)

### IP Whitelist Error

**Problem**: `MongoServerError: not authorized on admin to execute command`

**Solutions**:
1. Add your IP to Network Access whitelist
2. Or whitelist `0.0.0.0/0` (all IPs) for development
3. Remember to restrict IPs in production

---

## Security Best Practices

### Development

✅ Whitelist all IPs (0.0.0.0/0) for testing
✅ Use test credentials
✅ Enable auto-backup

### Production

✅ Whitelist only your app server IP
✅ Use strong, unique passwords
✅ Rotate passwords regularly
✅ Enable encryption at rest
✅ Enable VPC peering (paid feature)
✅ Use read-only roles when possible
✅ Enable database auditing
✅ Regular backups to external storage

---

## Data Backup

### Automatic Backups

MongoDB Atlas automatically creates backups:
- **Free tier (M0)**: Daily backups, 7-day retention
- **Paid tiers**: Configurable retention

### Manual Export

1. Go to **Clusters** → Your cluster
2. Click "..." → "Load Sample Data" or
3. Use MongoDB Compass to export

### Restore from Backup

1. Click "..." on cluster → "Restore from Backup"
2. Choose backup point
3. Click "Restore"

---

## Monitoring & Metrics

### View Database Usage

1. Go to **Clusters** → Your cluster
2. Click "Metrics" tab
3. View storage, connections, operations, etc.

### Set Up Alerts

1. Go to **Alerts**
2. Click "Create Alert"
3. Select trigger (e.g., >80% disk usage)
4. Add notification (email, Slack, etc.)

---

## Upgrade Cluster

If you outgrow the free tier:

1. Go to **Clusters**
2. Click "..." → "Modify Cluster"
3. Choose new tier (M2, M5, etc.)
4. Select number of nodes
5. Review billing
6. Click "Apply Changes"

**Note**: Paid clusters unlock more features:
- Larger storage
- Multiple regions
- Advanced security
- Higher performance

---

## Cost Estimation

### Free Tier (M0)
- Storage: 512 MB
- Connections: 100
- Cost: **$0/month**
- Perfect for development/testing

### Paid Tiers
- M2: 2GB, ~$10/month
- M5: 5GB, ~$25/month
- M10+: Higher specs, more expensive

---

## Helpful Links

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Node.js Driver](https://docs.mongodb.com/drivers/node/)
- [MongoDB University (Free Courses)](https://university.mongodb.com/)
- [MongoDB Status](https://status.mongodb.com/)

---

## Quick Reference

### Commands to Update .env

1. Copy your connection string from Atlas
2. Replace placeholders with actual values
3. Example:
```
MONGODB_URI=mongodb+srv://admin:MyPassword123@clustername.uqod1.mongodb.net/waste-segregation?retryWrites=true&w=majority
```

### Test Connection
```bash
npm start
```

Should see:
```
✅ MongoDB Connected: clustername.uqod1.mongodb.net
📊 Database: waste-segregation
```

---

## Next Steps

1. ✅ Create MongoDB Atlas account
2. ✅ Create cluster
3. ✅ Create database user
4. ✅ Whitelist IP address
5. ✅ Get connection string
6. ✅ Update `.env` file
7. ✅ Test connection with `npm start`
8. ✅ Register first user via API
9. ✅ Start using the application!

---

**System Status**: Ready to connect to MongoDB Atlas! 🚀

For questions, refer to official [MongoDB documentation](https://docs.mongodb.com/).
