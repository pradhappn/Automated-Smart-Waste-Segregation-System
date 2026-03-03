# API Documentation - Waste Segregation System

## Overview

Complete REST API documentation for the Automated Smart Waste Segregation System with MongoDB Atlas database integration.

---

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints (except auth) require JWT token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Routes

### 1. Register User
**Endpoint**: `POST /auth/register`  
**Access**: Public  
**Description**: Create a new user account

#### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "operator"
  }
}
```

---

### 2. Login User
**Endpoint**: `POST /auth/login`  
**Access**: Public  
**Description**: Authenticate user and get JWT token

#### Request Body
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

---

### 3. Create User (Admin only)
**Endpoint**: `POST /auth/create`  
**Access**: Private (admin role required)  
**Description**: Admins can create new users and assign roles

#### Request Headers
```
Authorization: Bearer <admin_jwt_token>
```

#### Request Body
```json
{
  "name": "Jane Analyst",
  "email": "jane@example.com",
  "password": "pass123",
  "role": "analyst"   // optional; defaults to operator
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Jane Analyst",
    "email": "jane@example.com",
    "role": "analyst"
  }
}
```


#### Response (200)
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "operator"
  }
}
```

---

### 3. Get Current User
**Endpoint**: `GET /auth/me`  
**Access**: Private (requires token)  
**Description**: Get current logged-in user details

#### Response (200)
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "operator",
    "isActive": true,
    "lastLogin": "2026-03-01T10:30:00.000Z"
  }
}
```

---

### 4. Update Profile
**Endpoint**: `PUT /auth/profile`  
**Access**: Private  
**Description**: Update user profile information

#### Request Body
```json
{
  "name": "John Updated",
  "email": "johnnew@example.com"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "user": { ... }
}
```

---

### 5. Change Password
**Endpoint**: `PUT /auth/change-password`  
**Access**: Private  
**Description**: Change user password

#### Request Body
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

---

### 6. Logout
**Endpoint**: `POST /auth/logout`  
**Access**: Private  
**Description**: Logout user (invalidate token on frontend)

#### Response (200)
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## Waste Routes

### 1. Process Waste
**Endpoint**: `POST /waste/process`  
**Access**: Private  
**Description**: Process waste with sensor data and classify it

#### Request Body
```json
{
  "metalLevel": 75,
  "moistureLevel": 45,
  "temperature": 28,
  "weight": 0.5
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Waste processed successfully",
  "data": {
    "waste": {
      "_id": "507f1f77bcf86cd799439012",
      "classification": "metal",
      "confidence": 85,
      "metalLevel": 75,
      "moistureLevel": 45,
      "temperature": 28,
      "weight": 0.5,
      "servo_direction": "metal",
      "bin_level": 45,
      "processedAt": "2026-03-01T10:30:00.000Z",
      "status": "success"
    },
    "bin": {
      "type": "metal",
      "currentLevel": 45,
      "status": "operational",
      "itemCount": 9
    }
  }
}
```

---

### 2. Get All Waste Records
**Endpoint**: `GET /waste`  
**Access**: Private  
**Query Parameters**:
- `classification`: Filter by type (metal/wet/dry)
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 10)

#### Example Request
```
GET /waste?classification=metal&page=1&limit=10
```

#### Response (200)
```json
{
  "success": true,
  "count": 10,
  "total": 45,
  "pages": 5,
  "currentPage": 1,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "classification": "metal",
      "confidence": 85,
      "metalLevel": 75,
      "moistureLevel": 45,
      "temperature": 28,
      "weight": 0.5,
      "processedBy": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2026-03-01T10:30:00.000Z"
    }
  ]
}
```

---

### 3. Get Waste by ID
**Endpoint**: `GET /waste/:id`  
**Access**: Private  
**Description**: Get specific waste record by ID

#### Response (200)
```json
{
  "success": true,
  "data": { ... }
}
```

---

### 4. Get Waste Statistics
**Endpoint**: `GET /waste/statistics`  
**Access**: Private  
**Query Parameters**:
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

#### Response (200)
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-02-01T00:00:00.000Z",
      "endDate": "2026-03-01T23:59:59.999Z"
    },
    "statistics": [
      {
        "_id": "metal",
        "count": 45,
        "avgConfidence": 88.5,
        "totalWeight": 22.5
      },
      {
        "_id": "wet",
        "count": 32,
        "avgConfidence": 85.2,
        "totalWeight": 16
      },
      {
        "_id": "dry",
        "count": 28,
        "avgConfidence": 82.1,
        "totalWeight": 14
      }
    ],
    "overall": {
      "totalWaste": 105,
      "avgConfidence": 85.3,
      "totalWeight": 52.5
    }
  }
}
```

---

### 5. Delete Waste Record
**Endpoint**: `DELETE /waste/:id`  
**Access**: Private (Admin only)  
**Description**: Delete a waste record from database

#### Response (200)
```json
{
  "success": true,
  "message": "Waste record deleted successfully"
}
```

---

## Bin Routes

### 1. Get All Bins
**Endpoint**: `GET /bins`  
**Access**: Private  
**Description**: Get all waste bins and their status

#### Response (200)
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "type": "metal",
      "capacity": 100,
      "currentLevel": 45,
      "itemCount": 9,
      "status": "operational",
      "warningThreshold": 70,
      "criticalThreshold": 90,
      "lastEmptied": "2026-02-28T14:30:00.000Z",
      "emptyCount": 5,
      "totalWeightStored": 22.5
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "type": "wet",
      "capacity": 100,
      "currentLevel": 62,
      "itemCount": 12,
      "status": "operational"
      // ... other fields
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "type": "dry",
      "capacity": 100,
      "currentLevel": 38,
      "itemCount": 7,
      "status": "operational"
      // ... other fields
    }
  ]
}
```

---

### 2. Get Specific Bin
**Endpoint**: `GET /bins/:type`  
**Access**: Private  
**Parameters**: `type` = metal/wet/dry

#### Response (200)
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "type": "metal",
    "capacity": 100,
    "currentLevel": 45,
    "itemCount": 9,
    "status": "operational",
    "lastEmptied": "2026-02-28T14:30:00.000Z",
    "nextEmptyDue": "2026-03-07T14:30:00.000Z",
    "emptyCount": 5,
    "totalWeightStored": 22.5
  }
}
```

---

### 3. Empty Bin
**Endpoint**: `POST /bins/:type/empty`  
**Access**: Private  
**Description**: Empty a specific bin and reset its level

#### Response (200)
```json
{
  "success": true,
  "message": "metal bin emptied successfully",
  "data": {
    "type": "metal",
    "currentLevel": 0,
    "previousLevel": 45,
    "lastEmptied": "2026-03-01T10:30:00.000Z",
    "emptyCount": 6
  }
}
```

---

### 4. Update Bin Settings
**Endpoint**: `PUT /bins/:type`  
**Access**: Private (Admin only)  
**Description**: Update bin capacity or thresholds

#### Request Body
```json
{
  "capacity": 150,
  "warningThreshold": 75,
  "criticalThreshold": 95,
  "location": "Floor 2"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Bin updated successfully",
  "data": { ... }
}
```

---

### 5. Get Bin Statistics
**Endpoint**: `GET /bins/statistics`  
**Access**: Private  
**Description**: Get aggregated statistics for all bins

#### Response (200)
```json
{
  "success": true,
  "data": {
    "totalBins": 3,
    "bins": [
      {
        "type": "metal",
        "currentLevel": 45,
        "percentage": 45,
        "status": "operational",
        "itemCount": 9,
        "totalWeightStored": 22.5
      },
      // ... other bins
    ],
    "averageLevel": 48,
    "criticalBins": 0,
    "warningBins": 0
  }
}
```

---

### 6. Check Bin Status & Alerts
**Endpoint**: `GET /bins/check-status`  
**Access**: Private  
**Description**: Check all bins and get alert notifications

#### Response (200)
```json
{
  "success": true,
  "alerts": [
    {
      "type": "metal",
      "status": "CRITICAL",
      "message": "metal bin is at critical level (92%)",
      "level": "critical"
    }
  ],
  "hasAlerts": true
}
```

---

### 7. Initialize Bins
**Endpoint**: `POST /bins/initialize`  
**Access**: Private (Admin only)  
**Description**: Create default bins if they don't exist

#### Response (200)
```json
{
  "success": true,
  "message": "Bins initialized successfully",
  "createdCount": 3,
  "data": [ ... ]
}
```

---

## System Logs Routes

### 1. Get All Logs
**Endpoint**: `GET /logs`  
**Access**: Private  
**Query Parameters**:
- `action`: Filter by action type
- `level`: Filter by level (info/warning/error)
- `page`: Page number
- `limit`: Records per page

#### Response (200)
```json
{
  "success": true,
  "count": 50,
  "total": 245,
  "pages": 5,
  "currentPage": 1,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "action": "WASTE_PROCESSED",
      "details": "Waste classified as metal with 85% confidence",
      "level": "info",
      "user": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "createdAt": "2026-03-01T10:30:00.000Z"
    }
  ]
}
```

---

### 2. Get Log Statistics
**Endpoint**: `GET /logs/statistics`  
**Access**: Private  
**Description**: Get statistics about system events

#### Response (200)
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-02-22T00:00:00.000Z",
      "endDate": "2026-03-01T23:59:59.999Z"
    },
    "statsByAction": [
      {
        "_id": "WASTE_PROCESSED",
        "count": 105
      },
      {
        "_id": "BIN_EMPTIED",
        "count": 6
      },
      {
        "_id": "USER_LOGIN",
        "count": 42
      }
    ],
    "statsByLevel": [
      {
        "_id": "info",
        "count": 150
      },
      {
        "_id": "warning",
        "count": 3
      },
      {
        "_id": "error",
        "count": 0
      }
    ],
    "recentErrors": []
  }
}
```

---

### 3. Create Log Entry
**Endpoint**: `POST /logs`  
**Access**: Private  
**Description**: Manually create a log entry

#### Request Body
```json
{
  "action": "CUSTOM_ACTION",
  "details": "Custom log message",
  "level": "info",
  "metadata": {
    "custom_field": "custom_value"
  }
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Log created successfully",
  "data": { ... }
}
```

---

### 4. Cleanup Old Logs
**Endpoint**: `DELETE /logs/cleanup`  
**Access**: Private (Admin only)  
**Description**: Delete logs older than specified days

#### Request Body
```json
{
  "days": 30
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Logs cleaned up successfully",
  "deletedCount": 125
}
```

---

### 5. Export Logs
**Endpoint**: `GET /logs/export`  
**Access**: Private  
**Query Parameters**:
- `format`: json or csv
- `action`: Filter by action (optional)
- `level`: Filter by level (optional)

#### CSV Export
```
Timestamp,Action,Level,User,Details
"2026-03-01T10:30:00.000Z","WASTE_PROCESSED","info","john@example.com","Waste classified as metal..."
```

---

## Health Check

### Server Health
**Endpoint**: `GET /health`  
**Access**: Public  
**Description**: Check if server is running

#### Response (200)
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "2026-03-01T10:30:00.000Z"
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "success": false,
  "message": "metalLevel must be a number between 0 and 100"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "message": "User role 'operator' is not authorized to access this route"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Waste record not found"
}
```

### 500 - Server Error
```json
{
  "success": false,
  "message": "Server Error"
}
```

---

## Rate Limiting

Currently no rate limiting. For production, consider implementing:
- Request throttling
- IP-based limits
- User-based limits

---

## Pagination

Used in list endpoints:

| Parameter | Default | Max |
|-----------|---------|-----|
| page | 1 | N/A |
| limit | 10 | 100 |

Example:
```
GET /waste?page=2&limit=20
```

---

## Data Types

### Classifications
```
- metal
- wet
- dry
```

### User Roles
```
- admin (full access)
- operator (process waste, view data)
- analyst (view data only)
```

### Bin Status
```
- operational (< 70%)
- warning (70-90%)
- critical (> 90%)
- maintenance
```

### Log Levels
```
- info
- warning
- error
```

### Log Actions
```
- WASTE_PROCESSED
- BIN_EMPTIED
- BIN_FULL
- USER_LOGIN
- USER_LOGOUT
- USER_CREATED
- SYSTEM_START
- SIMULATION_START
- SIMULATION_STOP
- ERROR
- WARNING
- INFO
```

---

## Summary of Endpoints

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | /auth/register | Public | Register new user |
| POST | /auth/login | Public | Login user |
| GET | /auth/me | Private | Get current user |
| PUT | /auth/profile | Private | Update profile |
| PUT | /auth/change-password | Private | Change password |
| POST | /auth/logout | Private | Logout |
| POST | /waste/process | Private | Process waste |
| GET | /waste | Private | Get all wastes |
| GET | /waste/:id | Private | Get waste by ID |
| GET | /waste/statistics | Private | Get statistics |
| DELETE | /waste/:id | Private | Delete waste |
| GET | /bins | Private | Get all bins |
| GET | /bins/:type | Private | Get bin by type |
| POST | /bins/:type/empty | Private | Empty bin |
| PUT | /bins/:type | Private | Update bin |
| GET | /bins/statistics | Private | Get bin stats |
| GET | /bins/check-status | Private | Check bin alerts |
| POST | /bins/initialize | Private | Initialize bins |
| GET | /logs | Private | Get logs |
| GET | /logs/statistics | Private | Get log stats |
| POST | /logs | Private | Create log |
| DELETE | /logs/cleanup | Private | Cleanup old logs |
| GET | /logs/export | Private | Export logs |
| GET | /health | Public | Health check |

---

**API Version**: 1.0  
**Last Updated**: March 1, 2026  
**Status**: Production Ready ✅
