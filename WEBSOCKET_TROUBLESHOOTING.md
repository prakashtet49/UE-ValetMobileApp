# WebSocket Connection Troubleshooting Guide

## Current Issue: Unauthorized Error

### Error Details
```
[WebSocket] ❌ CONNECTION ERROR
[WebSocket] Error: Unauthorized
```

This error means the WebSocket server is rejecting the authentication token.

## Authentication Methods Implemented

The hook now tries **three different authentication methods** simultaneously:

1. **Auth Object** - `auth: { token: accessToken }`
2. **Authorization Header** - `extraHeaders: { Authorization: 'Bearer <token>' }`
3. **Query Parameter** - `query: { token: accessToken }`

## Common Causes & Solutions

### 1. Token Format Issue
**Problem**: Server expects a different token format

**Check**:
- Look at the console log: `[WebSocket] Token preview: ...`
- Verify the token is valid and not expired
- Check if the token needs to be prefixed with "Bearer"

**Solution**:
```typescript
// If server expects just the token without "Bearer"
auth: { token: accessToken }

// If server expects "Bearer" prefix in auth
auth: { token: `Bearer ${accessToken}` }
```

### 2. Wrong Authentication Method
**Problem**: Server uses a different authentication mechanism

**Server-Side Options**:
- **Socket.IO Auth Middleware**: Expects `socket.handshake.auth.token`
- **HTTP Headers**: Expects `socket.handshake.headers.authorization`
- **Query Parameters**: Expects `socket.handshake.query.token`

**Current Implementation**: We send all three!

### 3. CORS or Network Issues
**Problem**: Server is not configured to accept WebSocket connections from mobile app

**Check Server Configuration**:
```javascript
// Server should have CORS enabled for WebSocket
io.use((socket, next) => {
  const token = socket.handshake.auth.token 
    || socket.handshake.headers.authorization?.replace('Bearer ', '')
    || socket.handshake.query.token;
  
  if (!token) {
    return next(new Error('Unauthorized'));
  }
  
  // Verify token here
  verifyToken(token, (err, decoded) => {
    if (err) return next(new Error('Unauthorized'));
    socket.userId = decoded.userId;
    next();
  });
});
```

### 4. Token Expired or Invalid
**Problem**: The token stored in AsyncStorage is no longer valid

**Solution**:
1. Log out and log back in to get a fresh token
2. Check token expiration in your backend logs
3. Implement token refresh before WebSocket connection

### 5. Wrong WebSocket Path
**Problem**: Server WebSocket endpoint is not at `/ws`

**Check**:
- Verify server WebSocket path configuration
- Common paths: `/socket.io`, `/ws`, `/websocket`, `/api/ws`

**Solution**: Update the path in the hook:
```typescript
const socket = io(baseUrl, {
  path: '/socket.io', // Change this to match your server
  // ... rest of config
});
```

## Debugging Steps

### Step 1: Check Server Logs
Look for WebSocket connection attempts in your server logs. You should see:
- Connection attempt
- Authentication attempt
- Reason for rejection

### Step 2: Test with Postman or wscat
Test the WebSocket endpoint directly:

```bash
# Install wscat
npm install -g wscat

# Test connection (replace with your token)
wscat -c "ws://13.50.218.71:80/ws?token=YOUR_TOKEN_HERE"
```

### Step 3: Verify Token in REST API
Make sure the token works with regular REST API calls:

```typescript
// Test in your app
const {accessToken} = await getStoredTokens();
console.log('Token:', accessToken);

// Try a regular API call
const response = await fetch(`${BASE_URL}/api/some-endpoint`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
console.log('REST API works:', response.ok);
```

### Step 4: Check Network Inspector
Use React Native Debugger or Flipper to inspect:
- WebSocket connection attempts
- Headers being sent
- Server responses

### Step 5: Simplify Connection
Try connecting without authentication first:

```typescript
// Temporary test - remove auth
const socket = io(baseUrl, {
  path: '/ws',
  transports: ['websocket'],
  // Remove all auth for testing
});
```

If this works, the issue is definitely authentication-related.

## Server-Side Implementation Example

Here's how your backend should handle WebSocket authentication:

### Express + Socket.IO (Node.js)
```javascript
const io = require('socket.io')(server, {
  cors: {
    origin: '*', // Configure properly for production
    methods: ['GET', 'POST'],
  },
  path: '/ws',
});

// Authentication middleware
io.use(async (socket, next) => {
  try {
    // Try multiple auth methods
    const token = 
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace('Bearer ', '') ||
      socket.handshake.query.token;

    if (!token) {
      console.error('No token provided');
      return next(new Error('Unauthorized'));
    }

    // Verify token (example with JWT)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.driverId = decoded.driverId;
    
    console.log('WebSocket authenticated:', socket.userId);
    next();
  } catch (error) {
    console.error('WebSocket auth failed:', error.message);
    next(new Error('Unauthorized'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id, 'User:', socket.userId);
  
  // Emit events
  socket.emit('jobs:active', { jobs: [], total: 0 });
  socket.emit('jobstats:today', { parkedCount: 0, deliveredCount: 0 });
  socket.emit('pickup:new', { requests: [] });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
```

## Quick Fixes to Try

### Fix 1: Update Token Format
```typescript
// In useValetRealtime.ts, try this:
auth: {
  token: `Bearer ${accessToken}`, // Add Bearer prefix
}
```

### Fix 2: Use Only Query Parameter
```typescript
// Simplify to just query param
const socket = io(baseUrl, {
  path: '/ws',
  query: {
    token: accessToken,
  },
  transports: ['websocket'],
});
```

### Fix 3: Disable Reconnection Temporarily
```typescript
// Disable auto-reconnect to avoid spam
reconnection: false,
```

## Expected Console Output (Success)

When working correctly, you should see:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[WebSocket] 🔄 INITIATING CONNECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[WebSocket] ✓ Token retrieved successfully
[WebSocket] Target URL: http://13.50.218.71:80
[WebSocket] Auth methods configured:
[WebSocket] - auth.token: ✓
[WebSocket] - extraHeaders.Authorization: ✓
[WebSocket] - query.token: ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[WebSocket] ✅ CONNECTED
[WebSocket] Socket ID: abc123xyz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Contact Backend Team

If none of these solutions work, contact your backend team with:

1. **Full error logs** from the mobile app
2. **Token sample** (first 20 characters)
3. **Expected authentication method** (auth object, header, or query)
4. **WebSocket endpoint path** (confirm it's `/ws`)
5. **Server logs** showing the connection attempt

## Additional Resources

- [Socket.IO Authentication Docs](https://socket.io/docs/v4/middlewares/#sending-credentials)
- [React Native Debugging](https://reactnative.dev/docs/debugging)
- [WebSocket Testing Tools](https://github.com/websockets/wscat)
