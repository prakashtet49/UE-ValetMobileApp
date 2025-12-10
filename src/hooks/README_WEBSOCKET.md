# WebSocket Real-time Updates

This document explains how to use the `useValetRealtime` hook for real-time updates in the Valet Mobile App.

## Overview

The `useValetRealtime` hook establishes a WebSocket connection to receive real-time updates for:
1. **Active Jobs** (`jobs:active`) - Updates when vehicles are parked/delivered
2. **Job Statistics** (`jobstats:today`) - Daily parked and delivered counts
3. **Pickup Requests** (`pickup:new`) - New pickup requests from guests

## Installation

The required dependency `socket.io-client` has been installed:

```bash
npm install socket.io-client
```

## Usage

### Basic Setup

Import and use the hook in any component:

```typescript
import {useValetRealtime} from '../hooks/useValetRealtime';

function MyComponent() {
  useValetRealtime({
    onActiveJobsUpdate: (payload) => {
      console.log('Active jobs updated:', payload);
      // Update your state here
    },
    onJobStatsUpdate: (payload) => {
      console.log('Job stats updated:', payload);
      // Update your state here
    },
    onNewPickupRequest: (payload) => {
      console.log('New pickup request:', payload);
      // Update your state here
    },
  });

  // Rest of your component...
}
```

### Payload Types

#### 1. Active Jobs Update (`jobs:active`)

```typescript
interface ActiveJobsPayload {
  jobs: ActiveJob[];
  total: number;
  pagination?: any;
  summary?: any;
}

// ActiveJob includes:
// - id: string
// - vehicleNumber: string
// - tagNumber: string
// - locationDescription: string
// - slotOrZone: string
// - parkedAt: string
// - hasPhotos: boolean
// - photoCount: number
// - bookingStatus: string
// - referenceNumber: string
// - parkedDurationMinutes: number
// - isOverdue?: boolean
```

#### 2. Job Statistics Update (`jobstats:today`)

```typescript
interface JobStatsPayload {
  parkedCount: number;
  deliveredCount: number;
}
```

#### 3. Pickup Requests Update (`pickup:new`)

```typescript
interface PickupRequestsPayload {
  requests: PendingPickupJob[];
}

// PendingPickupJob includes:
// - id: string
// - vehicleNumber: string
// - tagNumber: string
// - keyTagCode?: string
// - slotNumber?: string
// - locationDescription?: string
// - pickupPoint: string
// - requestedAt: string
// - status: string
```

### Complete Example (HomeScreen)

```typescript
import React, {useState} from 'react';
import {Alert} from 'react-native';
import {useValetRealtime} from '../hooks/useValetRealtime';

export default function HomeScreen() {
  const [todayStats, setTodayStats] = useState({
    parkedCount: 0,
    deliveredCount: 0,
  });
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [pendingPickupsCount, setPendingPickupsCount] = useState(0);

  // Setup WebSocket real-time updates
  useValetRealtime({
    onActiveJobsUpdate: (payload) => {
      console.log('[HomeScreen] Active jobs updated:', payload);
      setActiveJobsCount(payload.total);
    },
    onJobStatsUpdate: (payload) => {
      console.log('[HomeScreen] Job stats updated:', payload);
      setTodayStats({
        parkedCount: payload.parkedCount,
        deliveredCount: payload.deliveredCount,
      });
    },
    onNewPickupRequest: (payload) => {
      console.log('[HomeScreen] New pickup request:', payload);
      setPendingPickupsCount(payload.requests.length);
      
      // Show alert for new pickup
      if (payload.requests.length > 0) {
        Alert.alert(
          'New Pickup Request',
          `You have ${payload.requests.length} pending pickup request(s)`,
          [
            {text: 'View', onPress: () => navigation.navigate('PendingPickups')},
            {text: 'Later', style: 'cancel'},
          ]
        );
      }
    },
  });

  // Rest of your component...
}
```

## Connection Details

### Authentication
The WebSocket connection automatically uses the stored access token from `AsyncStorage` for authentication.

### Connection Configuration
- **Path**: `/ws`
- **Transport**: WebSocket only
- **Reconnection**: Enabled with 10 attempts
- **Reconnection Delay**: 1 second
- **Timeout**: 20 seconds

### Base URL
The connection uses the `BASE_URL` from your API configuration (`src/api/config.ts`).

## Features

### Auto-Reconnection
The hook automatically handles reconnection if the connection is lost.

### Token Refresh
When the user's token is refreshed, the WebSocket connection will automatically re-authenticate.

### Cleanup
The hook automatically cleans up the WebSocket connection when the component unmounts.

## Debugging

All WebSocket events are logged to the console:
- `[WebSocket] Connecting to: <url>`
- `[WebSocket] Connected: <socket-id>`
- `[WebSocket] Connection error: <error>`
- `[WebSocket] Disconnected: <reason>`
- `[WebSocket] Active jobs update: <payload>`
- `[WebSocket] Job stats update: <payload>`
- `[WebSocket] New pickup request: <payload>`

## Best Practices

1. **Use in Parent Components**: Place the hook in parent/container components that manage state for multiple child components.

2. **Combine with Initial Load**: Use WebSocket updates to supplement, not replace, initial data loading:
   ```typescript
   useEffect(() => {
     loadInitialData(); // Load data on mount
   }, []);
   
   useValetRealtime({
     onActiveJobsUpdate: (payload) => {
       // Update state with real-time data
     },
   });
   ```

3. **Handle Errors Gracefully**: The hook logs errors but doesn't throw them. Your app should handle missing WebSocket updates gracefully.

4. **Avoid Multiple Instances**: Only use the hook once per screen/feature to avoid duplicate connections.

## Troubleshooting

### Connection Not Establishing
- Check that `BASE_URL` is correctly configured in `src/api/config.ts`
- Verify the user is authenticated (has a valid token)
- Check server logs to ensure WebSocket endpoint is available at `/ws`

### Not Receiving Updates
- Check server-side event emission (events must match: `jobs:active`, `jobstats:today`, `pickup:new`)
- Verify the user has permission to receive these events
- Check console logs for connection status

### Reconnection Issues
- The hook will attempt to reconnect 10 times with 1-second delays
- If reconnection fails, the user may need to restart the app
- Check network connectivity

## Server-Side Requirements

Your backend must:
1. Accept WebSocket connections at `/ws` path
2. Authenticate using the `token` in the auth payload
3. Emit events with these exact names:
   - `jobs:active`
   - `jobstats:today`
   - `pickup:new`
4. Send payloads matching the TypeScript interfaces defined above
