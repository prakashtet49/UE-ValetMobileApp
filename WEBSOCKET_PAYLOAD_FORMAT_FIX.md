# WebSocket Payload Format Fix

## 🔴 Problem

WebSocket was receiving pickup requests, but the count was showing as 0 even though the payload had 4 items:

```
[WebSocket] Requests Count: 0  ❌
[WebSocket] Full Payload: [
  {id: "...", vehicleNumber: "TS07EK6011", ...},
  {id: "...", vehicleNumber: "ASD", ...},
  {id: "...", vehicleNumber: "HP", ...},
  {id: "...", vehicleNumber: "HARSHA", ...}
]

[HomeScreen] Requests array: undefined  ❌
[HomeScreen] Calculated newCount: 0  ❌
```

## 🎯 Root Cause

**Payload Format Mismatch**: The backend was sending the pickup requests as a **direct array**, but the frontend was expecting an **object with a `requests` property**.

### Backend Sends:
```javascript
// Direct array
[
  {id: "...", vehicleNumber: "TS07EK6011", ...},
  {id: "...", vehicleNumber: "ASD", ...},
  ...
]
```

### Frontend Expected:
```javascript
// Object with requests property
{
  requests: [
    {id: "...", vehicleNumber: "TS07EK6011", ...},
    {id: "...", vehicleNumber: "ASD", ...},
    ...
  ]
}
```

### Result:
```javascript
payload.requests?.length  // undefined (because payload is array, not object)
// undefined || 0 = 0
```

## ✅ Solution

Normalize the payload in the WebSocket hook to handle both formats.

### Implementation:

```typescript
socket.on('pickup:new', (payload: PickupRequestsPayload | PendingPickupJob[]) => {
  console.log('[WebSocket] Raw Payload Type:', Array.isArray(payload) ? 'Array' : 'Object');
  
  // Normalize payload - backend sends array directly, not {requests: [...]}
  const normalizedPayload: PickupRequestsPayload = Array.isArray(payload) 
    ? { requests: payload }  // ✅ Wrap array in object
    : payload;               // ✅ Use as-is if already object
  
  const requestsCount = normalizedPayload.requests?.length || 0;
  console.log('[WebSocket] Normalized Requests Count:', requestsCount);
  
  // Pass normalized payload to callback
  callbacksRef.current.onNewPickupRequest(normalizedPayload);
});
```

## 📊 Before vs After

### Before (Broken):

```
1. Backend emits: [{...}, {...}, {...}, {...}]
   ↓
2. WebSocket receives: [{...}, {...}, {...}, {...}]
   ↓
3. Code tries: payload.requests?.length
   ↓
4. Result: undefined (payload is array, not object)
   ↓
5. Fallback: undefined || 0 = 0
   ↓
6. UI shows: 0 ❌
```

### After (Fixed):

```
1. Backend emits: [{...}, {...}, {...}, {...}]
   ↓
2. WebSocket receives: [{...}, {...}, {...}, {...}]
   ↓
3. Check: Array.isArray(payload) = true
   ↓
4. Normalize: {requests: [{...}, {...}, {...}, {...}]}
   ↓
5. Code uses: normalizedPayload.requests.length
   ↓
6. Result: 4 ✅
   ↓
7. UI shows: 4 ✅
```

## 🔧 Changes Made

### 1. **Payload Type Union** ✅
```typescript
// Before
socket.on('pickup:new', (payload: PickupRequestsPayload) => {

// After
socket.on('pickup:new', (payload: PickupRequestsPayload | PendingPickupJob[]) => {
```

### 2. **Payload Normalization** ✅
```typescript
// Normalize payload - handle both formats
const normalizedPayload: PickupRequestsPayload = Array.isArray(payload) 
  ? { requests: payload }  // Backend sends array
  : payload;               // Or object with requests property
```

### 3. **Enhanced Logging** ✅
```typescript
console.log('[WebSocket] Raw Payload Type:', Array.isArray(payload) ? 'Array' : 'Object');
console.log('[WebSocket] Normalized Requests Count:', requestsCount);
```

### 4. **Use Normalized Payload** ✅
```typescript
const requestsCount = normalizedPayload.requests?.length || 0;
callbacksRef.current.onNewPickupRequest(normalizedPayload);
```

## 📝 Expected Logs Now

When pickup request arrives:

```
┌─────────────────────────────────────────┐
│ [WebSocket] 🚗 NEW PICKUP REQUEST       │
└─────────────────────────────────────────┘
[WebSocket] Timestamp: 2025-12-11T06:20:28.643Z
[WebSocket] Raw Payload Type: Array  ← Detects array format
[WebSocket] Full Payload: [
  {id: "...", vehicleNumber: "TS07EK6011", ...},
  {id: "...", vehicleNumber: "ASD", ...},
  {id: "...", vehicleNumber: "HP", ...},
  {id: "...", vehicleNumber: "HARSHA", ...}
]
[WebSocket] Normalized Requests Count: 4  ← Correct count!
[WebSocket] 📝 Request Details:
[WebSocket]   Request 1: {...}
[WebSocket]   Request 2: {...}
[WebSocket]   Request 3: {...}
[WebSocket]   Request 4: {...}
[WebSocket] ✓ Calling onNewPickupRequest callback
[WebSocket] ✓ Callback will receive: {requestsCount: 4, hasRequests: true}

[HomeScreen] 🚗 NEW PICKUP REQUEST RECEIVED
[HomeScreen] Payload received: {requests: [{...}, {...}, {...}, {...}]}
[HomeScreen] Requests array: [{...}, {...}, {...}, {...}]  ← Now defined!
[HomeScreen] Requests count: 4  ← Correct!
[HomeScreen] Previous count: 0
[HomeScreen] New count: 4
[HomeScreen] ✓ Updating state from 0 to 4

[HomeScreen] 🔄 PENDING PICKUPS STATE CHANGED
[HomeScreen] Count: 4
[HomeScreen] UI should now show: 4
```

## 🧪 Testing

### Test 1: Array Format (Current Backend)
```javascript
// Backend emits
socket.emit('pickup:new', [
  {id: "1", vehicleNumber: "ABC123"},
  {id: "2", vehicleNumber: "XYZ789"}
]);

// Frontend receives
✅ Normalized to: {requests: [{...}, {...}]}
✅ Count: 2
✅ UI shows: 2
```

### Test 2: Object Format (Future Backend)
```javascript
// Backend emits
socket.emit('pickup:new', {
  requests: [
    {id: "1", vehicleNumber: "ABC123"},
    {id: "2", vehicleNumber: "XYZ789"}
  ]
});

// Frontend receives
✅ Already correct format
✅ Count: 2
✅ UI shows: 2
```

### Test 3: Empty Array
```javascript
// Backend emits
socket.emit('pickup:new', []);

// Frontend receives
✅ Normalized to: {requests: []}
✅ Count: 0
✅ UI shows: 0
```

## 💡 Why This Approach

### ✅ Benefits:
1. **Backward compatible** - Works with current backend
2. **Forward compatible** - Works if backend changes to object format
3. **Type safe** - TypeScript union type handles both
4. **No backend changes needed** - Frontend adapts to backend
5. **Clear logging** - Shows which format was received

### ❌ Alternative (Not Recommended):
Change backend to send object format:
- Requires backend code changes
- May break other clients
- Takes more time to deploy
- Frontend should be flexible

## 🔍 Debugging

### Check Payload Format:
```
[WebSocket] Raw Payload Type: Array  ← Backend sends array
[WebSocket] Raw Payload Type: Object ← Backend sends object
```

### Check Normalization:
```
[WebSocket] Normalized Requests Count: X  ← Should match actual count
```

### Check HomeScreen:
```
[HomeScreen] Requests array: [...]  ← Should be defined, not undefined
[HomeScreen] Requests count: X      ← Should match payload length
```

## 📋 Summary

The issue is fixed by:

1. ✅ **Detect payload format** - Check if array or object
2. ✅ **Normalize payload** - Wrap array in `{requests: [...]}`
3. ✅ **Use normalized data** - Always access via `.requests`
4. ✅ **Enhanced logging** - Show format and count

The count now correctly reflects the number of pickup requests:
- ✅ Array format: `[{...}, {...}]` → `{requests: [{...}, {...}]}` → count = 2
- ✅ Object format: `{requests: [{...}, {...}]}` → count = 2
- ✅ UI updates immediately with correct count

Both backend formats are now supported! 🎯
