# WebSocket Event Name Fix

## 🔴 Problem

Pending pickups count was only updating when refreshing the page (via REST API), not in real-time via WebSocket.

## 🎯 Root Cause

**Event Name Mismatch**: The backend was emitting `pickup-requests/new` but the frontend was only listening to `pickup:new`.

### From Your Logs:

```
[WebSocket] 📨 RECEIVED EVENT: pickup-requests/new  ← Backend uses this
[WebSocket] Event data: [{...}, {...}, {...}, {...}]
```

But we were only listening to:
```typescript
socket.on('pickup:new', ...)  // ❌ Wrong event name
```

### Result:
- ❌ WebSocket receives event but no listener matches
- ❌ Callback never called
- ❌ State never updated
- ❌ UI only updates on manual refresh via REST API

## ✅ Solution

Listen to **both** event names to handle backend variations.

### Implementation:

```typescript
// Handler function (reusable for multiple event names)
const handlePickupRequest = (eventName: string, payload: PickupRequestsPayload | PendingPickupJob[]) => {
  console.log('[WebSocket] Event Name:', eventName);
  
  // Normalize payload
  const normalizedPayload: PickupRequestsPayload = Array.isArray(payload) 
    ? { requests: payload }
    : payload;
  
  const requestsCount = normalizedPayload.requests?.length || 0;
  
  // Call callback
  if (callbacksRef.current.onNewPickupRequest) {
    callbacksRef.current.onNewPickupRequest(normalizedPayload);
  }
};

// Listen to BOTH event names
socket.on('pickup:new', (payload) => handlePickupRequest('pickup:new', payload));
socket.on('pickup-requests/new', (payload) => handlePickupRequest('pickup-requests/new', payload));
```

## 📊 Before vs After

### Before (Broken):

```
Backend emits: 'pickup-requests/new'
     ↓
WebSocket receives event
     ↓
Check listeners:
  - 'pickup:new' ❌ No match
     ↓
No handler called
     ↓
State not updated
     ↓
UI shows old count
     ↓
User refreshes page
     ↓
REST API called
     ↓
UI updates ✅ (but not real-time)
```

### After (Fixed):

```
Backend emits: 'pickup-requests/new'
     ↓
WebSocket receives event
     ↓
Check listeners:
  - 'pickup:new' ❌ No match
  - 'pickup-requests/new' ✅ Match!
     ↓
handlePickupRequest() called
     ↓
Payload normalized
     ↓
Callback executed
     ↓
State updated
     ↓
UI updates immediately ✅ (real-time)
```

## 🔧 Changes Made

### 1. **Created Reusable Handler** ✅
```typescript
const handlePickupRequest = (eventName: string, payload: ...) => {
  console.log('[WebSocket] Event Name:', eventName);  // Shows which event triggered
  // ... normalize and process payload
};
```

### 2. **Listen to Multiple Event Names** ✅
```typescript
// Support both naming conventions
socket.on('pickup:new', (payload) => handlePickupRequest('pickup:new', payload));
socket.on('pickup-requests/new', (payload) => handlePickupRequest('pickup-requests/new', payload));
```

### 3. **Enhanced Logging** ✅
```typescript
console.log('[WebSocket] Event Name:', eventName);  // Shows which event was received
```

## 📝 Expected Logs Now

When pickup request arrives:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[WebSocket] 📨 RECEIVED EVENT: pickup-requests/new
[WebSocket] Event data: [{...}, {...}, {...}, {...}]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────┐
│ [WebSocket] 🚗 NEW PICKUP REQUEST       │
└─────────────────────────────────────────┘
[WebSocket] Event Name: pickup-requests/new  ← Shows which event triggered
[WebSocket] Timestamp: 2025-12-11T06:30:00.000Z
[WebSocket] Raw Payload Type: Array
[WebSocket] Normalized Requests Count: 4
[WebSocket] ✓ Calling onNewPickupRequest callback

[HomeScreen] 🚗 NEW PICKUP REQUEST RECEIVED
[HomeScreen] Requests count: 4
[HomeScreen] Previous count: 0
[HomeScreen] New count: 4
[HomeScreen] ✓ Updating state from 0 to 4

[HomeScreen] 🔄 PENDING PICKUPS STATE CHANGED
[HomeScreen] Count: 4
[HomeScreen] UI should now show: 4
```

## 🧪 Testing

### Test 1: Backend Uses 'pickup-requests/new'
```javascript
// Backend emits
socket.emit('pickup-requests/new', [{...}, {...}]);

// Frontend
✅ Listener matches: 'pickup-requests/new'
✅ Handler called
✅ State updated
✅ UI shows: 2
```

### Test 2: Backend Uses 'pickup:new'
```javascript
// Backend emits
socket.emit('pickup:new', [{...}, {...}]);

// Frontend
✅ Listener matches: 'pickup:new'
✅ Handler called
✅ State updated
✅ UI shows: 2
```

### Test 3: Real-Time Update
```
1. App shows: 4 pending pickups
2. Backend creates new pickup request
3. Backend emits: 'pickup-requests/new' with 5 items
4. WebSocket receives event
5. Handler processes payload
6. State updates: 4 → 5
7. UI updates immediately: 5 ✅ (no refresh needed)
```

## 🔍 Why Multiple Event Names?

### Backend Might Use Different Conventions:

1. **Colon separator**: `pickup:new`
   - Common in Socket.IO
   - Namespace-like structure

2. **Slash separator**: `pickup-requests/new`
   - REST-like naming
   - More descriptive

3. **Different versions**: Backend might change event names over time

### Our Solution:
✅ Support both formats
✅ No backend changes needed
✅ Forward compatible
✅ Logs show which event was used

## 💡 Best Practices

### ✅ DO:
- Support multiple event name variations
- Log which event triggered the handler
- Use reusable handler functions
- Keep backward compatibility

### ❌ DON'T:
- Assume single event name
- Hardcode event names without checking logs
- Remove old event listeners (keep for compatibility)

## 🐛 Debugging

### Check Which Events Are Received:
```
[WebSocket] 📨 RECEIVED EVENT: pickup-requests/new  ← Backend uses this
```

### Check Which Listener Matched:
```
[WebSocket] Event Name: pickup-requests/new  ← This listener was triggered
```

### Check If Handler Was Called:
```
[WebSocket] ✓ Calling onNewPickupRequest callback  ← Handler executed
```

### Check If State Updated:
```
[HomeScreen] ✓ Updating state from 4 to 5  ← State changed
```

## 📋 Event Names Reference

| Event Name | Status | Description |
|------------|--------|-------------|
| `pickup:new` | ✅ Supported | Original event name |
| `pickup-requests/new` | ✅ Supported | Backend's actual event name |
| `jobs:active` | ✅ Supported | Active jobs updates |
| `jobstats:today` | ✅ Supported | Job stats updates |

## 📝 Summary

The issue is fixed by:

1. ✅ **Created reusable handler** - `handlePickupRequest()`
2. ✅ **Listen to both event names** - `pickup:new` and `pickup-requests/new`
3. ✅ **Enhanced logging** - Shows which event triggered
4. ✅ **No backend changes needed** - Frontend adapts

The pending pickups count now updates in real-time:
- ✅ WebSocket event received
- ✅ Listener matches event name
- ✅ Handler processes payload
- ✅ State updates immediately
- ✅ UI reflects changes without refresh

Real-time updates now work properly! 🎯
