# WebSocket Not Receiving Events

## 🔴 Issue: No "NEW PICKUP REQUEST" Logs

If you're not seeing the `pickup:new` event logs at all, it means the event is **not being received** by the mobile app.

## 🔍 Diagnostic Steps

### Step 1: Check WebSocket Connection Status

Look for this in your logs:

#### ✅ If Connected:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[WebSocket] ✅ CONNECTED
[WebSocket] Socket ID: abc123xyz
[WebSocket] Transport: websocket
[WebSocket] Base URL: http://13.50.218.71:80
[WebSocket] 📡 Listening for events:
[WebSocket]   - jobs:active
[WebSocket]   - jobstats:today
[WebSocket]   - pickup:new
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### ❌ If Not Connected:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[WebSocket] ❌ CONNECTION ERROR
[WebSocket] Error: websocket error
[WebSocket] Type: TransportError
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2: Check for ANY Events

I've added a **catch-all listener** that will log **every event** from the server:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[WebSocket] 📨 RECEIVED EVENT: some-event-name
[WebSocket] Event data: {...}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**What to look for**:
- If you see **NO events at all** → Backend is not emitting anything
- If you see **other events but not `pickup:new`** → Backend is not emitting `pickup:new`
- If you see **`pickup:new` with wrong name** → Event name mismatch

## 🎯 Possible Causes

### Cause 1: WebSocket Server Not Running
**Symptom**: `TransportError` in logs

**Solution**: Backend needs to start WebSocket server (see `WEBSOCKET_SERVER_NOT_RUNNING.md`)

### Cause 2: Backend Not Emitting Events
**Symptom**: Connected but no events received

**Problem**: Backend Socket.IO server is running but not emitting events

**Backend Check**:
```javascript
// Backend should emit events like this:
io.emit('pickup:new', {
  requests: [...]
});
```

**Test from backend**:
```javascript
// Add this to backend to test
setInterval(() => {
  io.emit('pickup:new', {
    requests: [
      {
        bookingId: 'TEST' + Date.now(),
        customerName: 'Test Customer',
        status: 'pending'
      }
    ]
  });
  console.log('Emitted test pickup:new event');
}, 10000); // Every 10 seconds
```

### Cause 3: Wrong Event Name
**Symptom**: Catch-all shows events but with different names

**Problem**: Backend using different event name

**Common mistakes**:
- Backend: `pickup-new` → Mobile: `pickup:new` ❌
- Backend: `pickups:new` → Mobile: `pickup:new` ❌
- Backend: `pickup_new` → Mobile: `pickup:new` ❌
- Backend: `pickup:new` → Mobile: `pickup:new` ✅

**Event names must match EXACTLY** (case-sensitive, including colons)

### Cause 4: Events Sent to Wrong Socket
**Symptom**: Backend logs show emitting but mobile doesn't receive

**Problem**: Backend emitting to specific socket instead of all clients

**Backend patterns**:
```javascript
// ❌ Wrong - only to one socket
socket.emit('pickup:new', {...});

// ✅ Correct - to all connected clients
io.emit('pickup:new', {...});

// ✅ Also correct - to specific room
io.to('drivers').emit('pickup:new', {...});
```

### Cause 5: Authentication Blocking Events
**Symptom**: Connected but no events after connection

**Problem**: Backend requires authentication before sending events

**Backend should**:
1. Accept WebSocket connection
2. Authenticate socket
3. Start emitting events to authenticated socket

### Cause 6: Events Only on Trigger
**Symptom**: No events unless something happens

**This is normal!** Events are only emitted when:
- A new pickup request is created
- Job status changes
- Stats are updated

**To test**: Create a new pickup request from your system

## 🧪 Testing Checklist

Run through these tests:

### Test 1: Connection
- [ ] Check logs for `[WebSocket] ✅ CONNECTED`
- [ ] Note the Socket ID
- [ ] Confirm transport is `websocket`

### Test 2: Event Reception
- [ ] Look for `[WebSocket] 📨 RECEIVED EVENT` logs
- [ ] Check if ANY events are being received
- [ ] Note the event names being received

### Test 3: Backend Emission
- [ ] Check backend logs for event emission
- [ ] Verify backend is using `io.emit('pickup:new', ...)`
- [ ] Confirm event name matches exactly

### Test 4: Manual Trigger
- [ ] Create a new pickup request in your system
- [ ] Check if event is emitted by backend
- [ ] Check if event is received by mobile

### Test 5: Backend Test Code
- [ ] Add test emission code to backend (see below)
- [ ] Check if test events are received
- [ ] Verify payload structure

## 🔧 Backend Test Code

Add this to your backend to test event emission:

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

// Connection handler
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  // Send test event immediately on connection
  setTimeout(() => {
    console.log('📤 Sending test pickup:new event to', socket.id);
    socket.emit('pickup:new', {
      requests: [
        {
          bookingId: 'TEST001',
          customerName: 'Test Customer',
          vehicleNumber: 'TEST123',
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ]
    });
  }, 2000); // 2 seconds after connection
  
  // Send test events every 10 seconds
  const interval = setInterval(() => {
    console.log('📤 Sending periodic pickup:new event to', socket.id);
    socket.emit('pickup:new', {
      requests: [
        {
          bookingId: 'TEST' + Date.now(),
          customerName: 'Periodic Test',
          vehicleNumber: 'AUTO' + Math.floor(Math.random() * 1000),
          status: 'pending',
          createdAt: new Date().toISOString()
        }
      ]
    });
  }, 10000);
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    clearInterval(interval);
  });
});

server.listen(80, () => {
  console.log('🚀 Server running on port 80');
  console.log('📡 WebSocket available at /ws');
});
```

## 📊 Expected vs Actual

### If Backend is Working Correctly:

**Backend logs should show**:
```
✅ Client connected: abc123xyz
📤 Sending test pickup:new event to abc123xyz
📤 Sending periodic pickup:new event to abc123xyz
```

**Mobile logs should show**:
```
[WebSocket] ✅ CONNECTED
[WebSocket] Socket ID: abc123xyz
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[WebSocket] 📨 RECEIVED EVENT: pickup:new
[WebSocket] Event data: [{"requests": [...]}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────────────┐
│ [WebSocket] 🚗 NEW PICKUP REQUEST       │
└─────────────────────────────────────────┘
```

## 🔍 Debugging Commands

### Check Backend WebSocket Server
```bash
# Check if server is running
curl http://13.50.218.71:80/api/health

# Try WebSocket connection
wscat -c "ws://13.50.218.71:80/ws?token=YOUR_TOKEN"
```

### Monitor Backend Logs
```bash
# Watch backend logs for event emissions
tail -f /path/to/backend/logs/app.log | grep "pickup:new"
```

### Test Event Emission
```bash
# If backend has a test endpoint
curl -X POST http://13.50.218.71:80/api/test/emit-pickup
```

## 💡 Quick Fixes

### Fix 1: Add Test Emission on Connection
```javascript
io.on('connection', (socket) => {
  // Immediately send test event
  socket.emit('pickup:new', {
    requests: [{ bookingId: 'WELCOME', status: 'test' }]
  });
});
```

### Fix 2: Log All Emissions
```javascript
// Wrap io.emit to log all emissions
const originalEmit = io.emit.bind(io);
io.emit = function(event, ...args) {
  console.log('📤 Emitting event:', event, 'to all clients');
  return originalEmit(event, ...args);
};
```

### Fix 3: Verify Event Name
```javascript
// Use constant for event names
const EVENTS = {
  PICKUP_NEW: 'pickup:new',
  JOBS_ACTIVE: 'jobs:active',
  STATS_TODAY: 'jobstats:today'
};

// Emit using constant
io.emit(EVENTS.PICKUP_NEW, {...});
```

## 📝 Summary

**If you're not seeing `pickup:new` events**:

1. ✅ **Check connection** - Look for `[WebSocket] ✅ CONNECTED`
2. ✅ **Check catch-all** - Look for `[WebSocket] 📨 RECEIVED EVENT`
3. ✅ **Check backend** - Verify it's emitting events
4. ✅ **Check event name** - Must be exactly `pickup:new`
5. ✅ **Test manually** - Create pickup request to trigger event
6. ✅ **Add test code** - Use backend test code above

The catch-all listener will show **every event** from the server, so if you see nothing, the backend is not emitting any events at all.

## 🆘 Next Steps

1. **Run the app** with updated code
2. **Check logs** for connection status
3. **Look for catch-all logs** showing ANY events
4. **Share the logs** showing:
   - Connection status
   - Any events received (or none)
   - Backend emission logs (if available)

This will help identify exactly where the issue is!
