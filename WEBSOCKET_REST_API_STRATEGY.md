# WebSocket + REST API Strategy

## 📊 Data Update Strategy

The app uses a **hybrid approach** combining REST API and WebSocket for optimal performance and user experience.

## 🔄 How It Works

### Initial Load (REST API)
When HomeScreen mounts, it loads data via REST API:
```typescript
useEffect(() => {
  loadDashboard();  // ← REST API call
  loadLocations();
}, []);
```

**Why?**
- ✅ Get data immediately (don't wait for WebSocket)
- ✅ Works even if WebSocket server is down
- ✅ Provides fallback data source

### Real-time Updates (WebSocket)
After initial load, WebSocket provides real-time updates:
```typescript
useValetRealtime({
  onActiveJobsUpdate: (payload) => {
    setJobsOverview(prev => ({
      ...prev!,
      activeJobsCount: payload.total,
      lastUpdated: new Date().toISOString(),
    }));
  },
  onJobStatsUpdate: (payload) => {
    setTodayStats({
      parkedCount: payload.parkedCount,
      deliveredCount: payload.deliveredCount,
    });
  },
  onNewPickupRequest: (payload) => {
    setPendingPickups({count: payload.requests.length});
  },
});
```

**Why?**
- ✅ Instant updates when data changes
- ✅ No polling required
- ✅ Reduced server load
- ✅ Better user experience

### Manual Refresh (REST API)
User can pull-to-refresh to force reload:
```typescript
const onRefresh = async () => {
  setRefreshing(true);
  await loadDashboard();  // ← REST API call
  setRefreshing(false);
};
```

**Why?**
- ✅ User control over data refresh
- ✅ Useful if WebSocket connection is lost
- ✅ Provides reassurance to user

## 🎯 Data Flow

```
App Start
   ↓
[REST API] Load initial data
   ↓
Display data to user
   ↓
[WebSocket] Connect and listen
   ↓
[WebSocket] Receive real-time updates
   ↓
Update UI automatically
   ↓
User pulls to refresh (optional)
   ↓
[REST API] Reload data
```

## 📋 API Endpoints

### REST API (Initial Load + Manual Refresh)
1. **`GET /api/driver/job-stats/today`**
   - Returns: `{ parkedCount, deliveredCount }`
   - Used: Initial load, manual refresh

2. **`GET /api/v1/jobs/stats`**
   - Returns: `{ activeJobsCount, ... }`
   - Used: Initial load, manual refresh

3. **`GET /api/driver/pickup-requests/pending`**
   - Returns: `{ count, requests }`
   - Used: Initial load, manual refresh

### WebSocket (Real-time Updates)
1. **`jobs:active`**
   - Emitted when: Jobs are parked/delivered
   - Payload: `{ jobs, total, ... }`
   - Updates: Active jobs count

2. **`jobstats:today`**
   - Emitted when: Daily stats change
   - Payload: `{ parkedCount, deliveredCount }`
   - Updates: Today's statistics

3. **`pickup:new`**
   - Emitted when: New pickup request arrives
   - Payload: `{ requests }`
   - Updates: Pending pickups count
   - Shows: Alert notification

## ✅ What Was Changed

### Before (Redundant Calls)
```typescript
// Initial load
useEffect(() => {
  loadDashboard();  // ← REST API
}, []);

// On focus (REDUNDANT!)
useFocusEffect(() => {
  loadDashboard();  // ← REST API (unnecessary)
});

// WebSocket updates
useValetRealtime({...});  // ← Real-time updates
```

**Problem**: Data was loaded via REST API every time screen came into focus, even though WebSocket was providing real-time updates.

### After (Optimized)
```typescript
// Initial load only
useEffect(() => {
  loadDashboard();  // ← REST API (initial data)
}, []);

// On focus - no data reload
useFocusEffect(() => {
  // Only handle navigation params
  // WebSocket handles data updates
});

// WebSocket updates
useValetRealtime({...});  // ← Real-time updates
```

**Benefits**:
- ✅ Reduced API calls
- ✅ Faster screen transitions
- ✅ Lower server load
- ✅ WebSocket handles all updates

## 🔍 When Each Method is Used

| Scenario | Method | Reason |
|----------|--------|--------|
| App starts | REST API | Get initial data immediately |
| Data changes on backend | WebSocket | Real-time update |
| Screen comes into focus | Nothing | WebSocket already updated |
| User pulls to refresh | REST API | User-initiated reload |
| WebSocket disconnected | REST API | Fallback on refresh |

## 💡 Best Practices

### ✅ DO
- Use REST API for initial load
- Use WebSocket for real-time updates
- Keep manual refresh option
- Handle WebSocket disconnection gracefully
- Show loading states appropriately

### ❌ DON'T
- Don't call REST API on every screen focus
- Don't duplicate data fetching
- Don't rely only on WebSocket (need fallback)
- Don't poll when WebSocket is available
- Don't remove manual refresh option

## 🎯 Benefits of This Approach

### Performance
- ✅ Fewer API calls
- ✅ Instant updates
- ✅ Reduced bandwidth
- ✅ Lower server load

### User Experience
- ✅ Data always up-to-date
- ✅ No manual refresh needed
- ✅ Instant notifications
- ✅ Smooth transitions

### Reliability
- ✅ Works if WebSocket fails
- ✅ Initial data always loads
- ✅ Manual refresh available
- ✅ Graceful degradation

## 📊 Data Freshness

| Method | Freshness | Latency | Server Load |
|--------|-----------|---------|-------------|
| REST API (polling) | Depends on interval | High | High |
| REST API (on focus) | On navigation | Medium | Medium |
| WebSocket | Real-time | Very low | Very low |
| **Our Hybrid** | **Real-time** | **Very low** | **Low** |

## 🔧 Implementation Details

### HomeScreen.tsx Changes

1. **Removed redundant API call**:
```typescript
// Before
useFocusEffect(() => {
  loadDashboard();  // ← REMOVED
  handleNavigationParams();
});

// After
useFocusEffect(() => {
  handleNavigationParams();  // Only this
});
```

2. **Added clarifying comments**:
```typescript
// Load dashboard data via REST API
// Used for: Initial load on mount, Manual refresh (pull-to-refresh)
// Note: Real-time updates are handled by WebSocket (useValetRealtime hook)
async function loadDashboard() {
  // ...
}
```

3. **WebSocket handles updates**:
```typescript
// Setup WebSocket real-time updates for HomeScreen only
// This connects to 3 endpoints: jobs/active, job-stats/today, pickup-requests/new
useValetRealtime({
  onActiveJobsUpdate: (payload) => { /* update state */ },
  onJobStatsUpdate: (payload) => { /* update state */ },
  onNewPickupRequest: (payload) => { /* update state */ },
});
```

## 📝 Summary

The app now uses an **optimized hybrid approach**:

1. **Initial Load**: REST API (fast, reliable)
2. **Real-time Updates**: WebSocket (instant, efficient)
3. **Manual Refresh**: REST API (user control)

This provides the best of both worlds:
- ✅ Immediate initial data
- ✅ Real-time updates
- ✅ Fallback mechanism
- ✅ User control
- ✅ Optimal performance

The redundant API calls have been removed, and the app now relies on WebSocket for real-time updates after the initial load.
