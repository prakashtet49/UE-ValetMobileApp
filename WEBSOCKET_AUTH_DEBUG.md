# WebSocket Authentication Debug Guide

## 🔴 Current Issue

**Status**: WebSocket connection is being **REJECTED** by the server with "Unauthorized" error.

**Error Message**: `Unauthorized`

## 📊 What We're Sending

The mobile app is sending the authentication token in **3 different ways** to maximize compatibility:

### 1. Auth Object
```javascript
auth: {
  token: "eyJpc3MiOiJodHRwczovL3NxbGdlen..." // Full JWT token
}
```
**Backend Access**: `socket.handshake.auth.token`

### 2. Authorization Header
```javascript
extraHeaders: {
  Authorization: "Bearer eyJpc3MiOiJodHRwczovL3NxbGdlen..." // Bearer + JWT token
}
```
**Backend Access**: `socket.handshake.headers.authorization`

### 3. Query Parameter
```javascript
query: {
  token: "eyJpc3MiOiJodHRwczovL3NxbGdlen..." // Full JWT token
}
```
**Backend Access**: `socket.handshake.query.token`

## ✅ What Works

The **REST API authentication works perfectly** with the same token:
```javascript
headers: {
  Authorization: "Bearer eyJpc3MiOiJodHRwczovL3NxbGdlen..."
}
```

This proves:
- ✅ Token is valid
- ✅ Token format is correct
- ✅ User is authenticated
- ✅ Token has proper permissions

## ❌ What Doesn't Work

The **WebSocket connection is rejected** even though we're sending the same valid token.

## 🔍 Possible Causes

### 1. WebSocket Middleware Not Checking Correct Location
The backend WebSocket middleware might be looking for the token in a different location than where we're sending it.

**Solution**: Backend needs to check all three locations:
```javascript
// Socket.IO server middleware example
io.use((socket, next) => {
  // Try to get token from multiple sources
  const token = 
    socket.handshake.auth.token ||
    socket.handshake.headers.authorization?.replace('Bearer ', '') ||
    socket.handshake.query.token;
  
  if (!token) {
    return next(new Error('Unauthorized'));
  }
  
  // Verify token (same logic as REST API)
  try {
    const decoded = verifyJWT(token);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
});
```

### 2. Different Token Validation Logic
The WebSocket server might be using different token validation logic than the REST API.

**Solution**: Use the **same token validation** for both REST API and WebSocket.

### 3. CORS or Origin Issues
WebSocket might be rejecting connections due to CORS/origin restrictions.

**Solution**: Configure Socket.IO CORS:
```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // Or specific origins
    methods: ["GET", "POST"],
    credentials: true
  }
});
```

### 4. Path Mismatch
The WebSocket server might not be listening on `/ws` path.

**Current Config**: 
- Path: `/ws`
- Full URL: `http://13.50.218.71:80/ws`

**Solution**: Verify backend Socket.IO server is configured with:
```javascript
const io = require('socket.io')(server, {
  path: '/ws'
});
```

### 5. Transport Issues
Server might not support WebSocket-only transport.

**Current Config**: `transports: ['websocket']`

**Solution**: Enable WebSocket transport on server:
```javascript
const io = require('socket.io')(server, {
  transports: ['websocket', 'polling']
});
```

## 🛠️ Backend Requirements

For the WebSocket connection to work, the backend needs:

### 1. Socket.IO Server Setup
```javascript
const io = require('socket.io')(server, {
  path: '/ws',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});
```

### 2. Authentication Middleware
```javascript
io.use(async (socket, next) => {
  try {
    // Get token from multiple sources
    const token = 
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '') ||
      socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Unauthorized'));
    }
    
    // Verify token (use same logic as REST API)
    const user = await verifyToken(token);
    socket.userId = user.id;
    socket.userRole = user.role;
    
    next();
  } catch (error) {
    console.error('WebSocket auth error:', error);
    next(new Error('Unauthorized'));
  }
});
```

### 3. Event Emitters
The backend should emit these events when data changes:

```javascript
// When active jobs change
io.emit('jobs:active', {
  jobs: [...],
  total: 5,
  pagination: {...},
  summary: {...}
});

// When job stats change
io.emit('jobstats:today', {
  parkedCount: 10,
  deliveredCount: 5
});

// When new pickup request arrives
io.emit('pickup:new', {
  requests: [...]
});
```

## 📝 Testing Steps

### Step 1: Verify Token
Run this in the app and copy the full token:
```
[WebSocket] Full token: eyJpc3MiOiJodHRwczovL3NxbGdlen...
```

### Step 2: Test Token with REST API
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://13.50.218.71:80/api/driver/jobs/active
```
Should return 200 OK with data.

### Step 3: Test WebSocket Connection
Use a WebSocket testing tool (like Postman or wscat):
```bash
wscat -c "ws://13.50.218.71:80/ws?token=YOUR_TOKEN"
```

### Step 4: Check Backend Logs
Look for:
- WebSocket connection attempts
- Authentication errors
- Token validation logs

## 🔧 Quick Fixes to Try

### Fix 1: Add Logging to Backend
```javascript
io.use((socket, next) => {
  console.log('WebSocket connection attempt:', {
    auth: socket.handshake.auth,
    headers: socket.handshake.headers,
    query: socket.handshake.query
  });
  // ... rest of auth logic
});
```

### Fix 2: Temporarily Disable Auth (Testing Only)
```javascript
// TESTING ONLY - Remove after debugging
io.use((socket, next) => {
  console.log('Allowing connection for testing');
  next();
});
```

If this works, it confirms the issue is with token validation.

### Fix 3: Match REST API Auth Logic
Copy the exact token validation logic from your REST API middleware to the WebSocket middleware.

## 📞 What Backend Team Needs to Check

1. **Is Socket.IO server running?**
   - Check if the server is listening on port 80
   - Verify the `/ws` path is configured

2. **Is authentication middleware checking the right location?**
   - Check `socket.handshake.auth.token`
   - Check `socket.handshake.headers.authorization`
   - Check `socket.handshake.query.token`

3. **Is the token validation logic the same as REST API?**
   - Should use the same JWT verification
   - Should check the same database/cache
   - Should have the same permissions

4. **Are CORS settings correct?**
   - Should allow connections from mobile app
   - Should allow WebSocket upgrade

5. **Are the event names correct?**
   - `jobs:active` (not `jobs/active`)
   - `jobstats:today` (not `job-stats/today`)
   - `pickup:new` (not `pickup-requests/new`)

## 📊 Current Mobile App Configuration

```typescript
// Connection URL
BASE_URL: 'http://13.50.218.71:80'

// WebSocket path
path: '/ws'

// Full WebSocket URL
ws://13.50.218.71:80/ws

// Authentication
auth: { token: "JWT_TOKEN" }
extraHeaders: { Authorization: "Bearer JWT_TOKEN" }
query: { token: "JWT_TOKEN" }

// Transport
transports: ['websocket']

// Reconnection
reconnection: true
reconnectionAttempts: 10
reconnectionDelay: 1000ms
timeout: 20000ms
```

## ✅ Success Criteria

When the issue is fixed, you should see:
```
[WebSocket] ✅ CONNECTED
[WebSocket] Socket ID: abc123
[WebSocket] Transport: websocket
```

And start receiving events:
```
┌─────────────────────────────────────────┐
│ [WebSocket] 📋 ACTIVE JOBS UPDATE       │
└─────────────────────────────────────────┘
```

## 🆘 Need Help?

If the issue persists:
1. Share the backend Socket.IO server code
2. Share the authentication middleware code
3. Share backend logs during connection attempt
4. Confirm the WebSocket server is running and accessible

The mobile app is configured correctly and sending the token in all standard ways. The issue is on the backend side with how the WebSocket server is validating the authentication.
