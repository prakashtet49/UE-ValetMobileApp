# WebSocket Token Authentication - Critical Info

## 🔑 Token Type

The app is using a **Temporary Access Code** (not a JWT token) for authentication.

### How It Works

1. **User logs in** with a temporary access code (e.g., `ABC123`)
2. **Backend validates** the code via `/api/drivers/login`
3. **App stores** the code in AsyncStorage as the "access token"
4. **All API calls** use this code with `Authorization: Bearer ABC123`

### ✅ What Works

**REST API calls work perfectly** with this temporary access code:
```typescript
// These all work with the temp code
await getDriverProfile();        // ✅ Works
await getTodayJobStats();        // ✅ Works  
await getActiveJobs();           // ✅ Works
await getPendingPickups();       // ✅ Works
```

All these calls send:
```
Authorization: Bearer ABC123
```

And the backend accepts it! ✅

### ❌ What Doesn't Work

**WebSocket connection fails** with the same temporary access code:
```typescript
// WebSocket connection
io(baseUrl, {
  auth: { token: "ABC123" },
  extraHeaders: { Authorization: "Bearer ABC123" },
  query: { token: "ABC123" }
});
```

Result: `Unauthorized` ❌

## 🎯 The Problem

The backend has **two different authentication systems**:

### REST API Authentication
- ✅ Accepts temporary access code
- ✅ Validates via middleware
- ✅ Works perfectly

### WebSocket Authentication  
- ❌ Rejects temporary access code
- ❌ Expects different token format (JWT?)
- ❌ Different validation logic

## 🔧 The Solution

The backend WebSocket server needs to use the **same authentication logic** as the REST API.

### Current REST API Middleware (Working)
```javascript
// This works - accepts temp code
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // Validates temp code
  const session = validateTempCode(token);
  if (session) {
    req.user = session;
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
```

### Required WebSocket Middleware (Not Working)
```javascript
// This should work the same way
io.use(async (socket, next) => {
  // Get token from multiple sources
  const token = 
    socket.handshake.auth.token ||
    socket.handshake.headers.authorization?.replace('Bearer ', '') ||
    socket.handshake.query.token;
  
  if (!token) {
    return next(new Error('Unauthorized'));
  }
  
  // Use SAME validation as REST API
  const session = validateTempCode(token);  // ← Same function!
  if (session) {
    socket.userId = session.driver_id;
    socket.userRole = session.role;
    next();
  } else {
    next(new Error('Unauthorized'));
  }
});
```

## 📊 Token Flow

### Login Flow
```
1. User enters temp code: "ABC123"
2. App calls: POST /api/drivers/login { code: "ABC123" }
3. Backend validates and returns: { ok: true, session: {...} }
4. App stores: AsyncStorage.set("accessToken", "ABC123")
```

### REST API Flow (✅ Works)
```
1. App retrieves: token = AsyncStorage.get("accessToken") // "ABC123"
2. App sends: Authorization: Bearer ABC123
3. Backend validates temp code
4. Backend returns data
```

### WebSocket Flow (❌ Fails)
```
1. App retrieves: token = AsyncStorage.get("accessToken") // "ABC123"
2. App sends: auth.token = "ABC123"
3. Backend rejects: "Unauthorized"
4. Connection fails
```

## 🧪 Test to Confirm

### Test 1: REST API (Should Work)
```bash
# Get your temp code from the app logs
TOKEN="ABC123"

# Test REST API
curl -H "Authorization: Bearer $TOKEN" \
  http://13.50.218.71:80/api/driver/profile

# Should return 200 OK with profile data
```

### Test 2: WebSocket (Currently Fails)
```bash
# Test WebSocket with same token
wscat -c "ws://13.50.218.71:80/ws?token=$TOKEN"

# Currently returns: Unauthorized
# Should work the same as REST API
```

## 💡 Key Insight

The mobile app is **correctly configured**. It's sending the same token that works for REST API calls.

The issue is that the **backend WebSocket server uses different authentication logic** than the REST API server.

## ✅ Fix Required

Backend team needs to:

1. **Find the WebSocket authentication middleware**
2. **Copy the REST API token validation logic**
3. **Apply the same logic to WebSocket connections**

The WebSocket server should accept the **same temporary access code** that the REST API accepts.

## 📝 Example Backend Code

If using Socket.IO with Express:

```javascript
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  path: '/ws',
  cors: { origin: '*' }
});

// Shared token validation function
function validateToken(token) {
  // This should be the SAME function used by REST API
  // It validates the temporary access code
  return validateTempAccessCode(token);
}

// REST API middleware (currently working)
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const session = validateToken(token);
  if (session) {
    req.user = session;
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// WebSocket middleware (needs to use same validation)
io.use((socket, next) => {
  const token = 
    socket.handshake.auth.token ||
    socket.handshake.headers.authorization?.replace('Bearer ', '') ||
    socket.handshake.query.token;
  
  const session = validateToken(token);  // ← Same function!
  if (session) {
    socket.user = session;
    next();
  } else {
    next(new Error('Unauthorized'));
  }
});

// WebSocket events
io.on('connection', (socket) => {
  console.log('User connected:', socket.user.driver_id);
  
  // Emit events when data changes
  socket.emit('jobs:active', {...});
  socket.emit('jobstats:today', {...});
  socket.emit('pickup:new', {...});
});
```

## 🎯 Summary

- ✅ Mobile app is correctly configured
- ✅ Token is valid (works with REST API)
- ✅ Token is being sent correctly
- ❌ Backend WebSocket uses different auth logic
- 🔧 Backend needs to use same auth for both REST and WebSocket

The fix is entirely on the backend side. The mobile app implementation is complete and correct.
