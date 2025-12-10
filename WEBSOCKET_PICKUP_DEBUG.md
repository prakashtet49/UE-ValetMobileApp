# WebSocket Pickup:New Debug Guide

## 🔍 Enhanced Logging

I've added comprehensive logging to track the `pickup:new` WebSocket event from reception to UI update.

## 📊 What You'll See in Logs

### 1. WebSocket Hook Receives Event

When the backend emits `pickup:new`, you'll see:

```
┌─────────────────────────────────────────┐
│ [WebSocket] 🚗 NEW PICKUP REQUEST       │
└─────────────────────────────────────────┘
[WebSocket] Timestamp: 2025-12-08T16:40:00.000Z
[WebSocket] Requests Count: 2
[WebSocket] Full Payload: {
  "requests": [
    {
      "bookingId": "abc123",
      "customerName": "John Doe",
      "vehicleNumber": "ABC123",
      ...
    },
    {
      "bookingId": "def456",
      "customerName": "Jane Smith",
      "vehicleNumber": "XYZ789",
      ...
    }
  ]
}
[WebSocket] 📝 Request Details:
[WebSocket]   Request 1: {
  "bookingId": "abc123",
  "customerName": "John Doe",
  ...
}
[WebSocket]   Request 2: {
  "bookingId": "def456",
  "customerName": "Jane Smith",
  ...
}
─────────────────────────────────────────
[WebSocket] ✓ Calling onNewPickupRequest callback
[WebSocket] ✓ Callback will receive: {
  "requestsCount": 2,
  "hasRequests": true
}
```

### 2. HomeScreen Processes Event

Then you'll see HomeScreen handling it:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[HomeScreen] 🚗 NEW PICKUP REQUEST RECEIVED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[HomeScreen] Payload received: {
  "requests": [...]
}
[HomeScreen] Requests array: [...]
[HomeScreen] Requests count: 2
[HomeScreen] Setting pending pickups count to: 2
[HomeScreen] ✓ Showing alert for 2 pickup request(s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. UI Updates

After the logs, you should see:
- ✅ Pending pickups count badge updated
- ✅ Alert dialog shown (if requests > 0)

## 🧪 Testing Steps

### Step 1: Check WebSocket Connection
Look for this in logs:
```
[WebSocket] ✅ CONNECTED
[WebSocket] Socket ID: abc123
```

If you see `TransportError` instead, the WebSocket server is not running.

### Step 2: Trigger Pickup Request
From backend, emit a test event:
```javascript
// Backend code
io.emit('pickup:new', {
  requests: [
    {
      bookingId: 'test123',
      customerName: 'Test Customer',
      vehicleNumber: 'TEST123',
      status: 'pending'
    }
  ]
});
```

### Step 3: Check Mobile Logs
You should see the full log sequence above.

### Step 4: Verify UI Update
- Check if pending pickups count badge shows the correct number
- Check if alert dialog appears

## 🔴 Common Issues

### Issue 1: No Logs at All
**Symptom**: No WebSocket logs appear

**Cause**: WebSocket not connected

**Check**:
```
[WebSocket] ❌ CONNECTION ERROR
[WebSocket] Error: websocket error
[WebSocket] Type: TransportError
```

**Solution**: Backend WebSocket server needs to be started

### Issue 2: Event Not Received
**Symptom**: Connection logs appear but no `pickup:new` logs

**Cause**: Backend not emitting the event or using wrong event name

**Check Backend**:
- Event name must be exactly `pickup:new` (not `pickup-new` or `pickups:new`)
- Event must be emitted to all connected clients or specific socket

**Backend Example**:
```javascript
// Emit to all clients
io.emit('pickup:new', { requests: [...] });

// Or emit to specific socket
socket.emit('pickup:new', { requests: [...] });
```

### Issue 3: Empty Payload
**Symptom**: Event received but `requests` array is empty

**Logs**:
```
[WebSocket] Requests Count: 0
[WebSocket] ⚠️ No requests in payload
```

**Cause**: Backend sending empty array

**Solution**: Backend should only emit when there are actual requests

### Issue 4: Wrong Payload Structure
**Symptom**: Error in logs or undefined values

**Expected Structure**:
```typescript
{
  requests: [
    {
      bookingId: string,
      customerName?: string,
      vehicleNumber?: string,
      status: string,
      // ... other fields
    }
  ]
}
```

**Check**: Backend payload matches this structure

### Issue 5: UI Not Updating
**Symptom**: Logs show correct data but UI doesn't update

**Possible Causes**:
1. State not updating correctly
2. Component not re-rendering
3. Badge not reflecting state changes

**Debug**:
```javascript
// Add this to HomeScreen after setPendingPickups
console.log('[HomeScreen] State updated, pendingPickups:', pendingPickups);
```

## 📋 Checklist

When testing `pickup:new` WebSocket event:

- [ ] WebSocket connected successfully
- [ ] Backend emits `pickup:new` event
- [ ] Event name is exactly `pickup:new`
- [ ] Payload has `requests` array
- [ ] Requests array has correct structure
- [ ] WebSocket hook logs show event received
- [ ] HomeScreen logs show callback called
- [ ] Pending pickups count updates
- [ ] Alert dialog appears (if requests > 0)
- [ ] UI badge shows correct count

## 🎯 Expected Log Flow

```
1. [WebSocket] ✅ CONNECTED
   ↓
2. Backend emits pickup:new
   ↓
3. [WebSocket] 🚗 NEW PICKUP REQUEST
   [WebSocket] Requests Count: X
   [WebSocket] Full Payload: {...}
   [WebSocket] 📝 Request Details: [...]
   ↓
4. [WebSocket] ✓ Calling onNewPickupRequest callback
   ↓
5. [HomeScreen] 🚗 NEW PICKUP REQUEST RECEIVED
   [HomeScreen] Payload received: {...}
   [HomeScreen] Setting pending pickups count to: X
   ↓
6. [HomeScreen] ✓ Showing alert for X pickup request(s)
   ↓
7. UI updates with new count and alert
```

## 🔧 Backend Test Code

Use this to test from backend:

```javascript
// Test emit pickup:new event
function testPickupEvent() {
  io.emit('pickup:new', {
    requests: [
      {
        bookingId: 'TEST001',
        customerName: 'Test Customer',
        customerPhone: '+1234567890',
        vehicleNumber: 'TEST123',
        vehicleType: 'Sedan',
        status: 'pending',
        requestedAt: new Date().toISOString()
      }
    ]
  });
  console.log('✓ Emitted pickup:new test event');
}

// Call this function to test
testPickupEvent();
```

## 📊 Payload Examples

### Single Request
```json
{
  "requests": [
    {
      "bookingId": "BK001",
      "customerName": "John Doe",
      "customerPhone": "+1234567890",
      "vehicleNumber": "ABC123",
      "vehicleType": "Sedan",
      "status": "pending",
      "requestedAt": "2025-12-08T16:40:00.000Z"
    }
  ]
}
```

### Multiple Requests
```json
{
  "requests": [
    {
      "bookingId": "BK001",
      "customerName": "John Doe",
      "vehicleNumber": "ABC123",
      "status": "pending"
    },
    {
      "bookingId": "BK002",
      "customerName": "Jane Smith",
      "vehicleNumber": "XYZ789",
      "status": "pending"
    }
  ]
}
```

### Empty (No Requests)
```json
{
  "requests": []
}
```

## 🚀 Next Steps

1. **Run the app** and check logs
2. **Trigger pickup event** from backend
3. **Look for the log sequence** above
4. **Verify UI updates** with correct count
5. **Share logs** if issue persists

The enhanced logging will show exactly where the data flow breaks, making it easy to identify and fix the issue.

## 💡 Tips

- **Use log filtering**: Search for `[WebSocket]` or `[HomeScreen]` to focus on relevant logs
- **Check timestamps**: Ensure events are recent and not stale
- **Verify payload structure**: Make sure backend sends correct format
- **Test with simple payload**: Start with 1 request, then test multiple
- **Monitor network**: Use React Native Debugger to see WebSocket frames

If you see the full log sequence but UI still doesn't update, the issue is in the state management or rendering logic, not the WebSocket connection.
