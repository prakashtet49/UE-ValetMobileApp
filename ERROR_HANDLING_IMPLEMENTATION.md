# Error Handling Implementation

## Overview
Comprehensive error handling has been implemented throughout the app to prevent crashes and provide user-friendly error messages.

## Components Added

### 1. ErrorBoundary Component
**Location:** `src/components/ErrorBoundary.tsx`

A React Error Boundary that catches JavaScript errors anywhere in the component tree and displays a fallback UI.

**Features:**
- Catches all React component errors
- Shows user-friendly error screen
- Provides "Try Again" button to reset
- Shows error details in development mode
- Prevents app crashes from unhandled errors

**Usage:**
```tsx
<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### 2. Error Handler Utilities
**Location:** `src/utils/errorHandler.ts`

Centralized error handling utilities for consistent error management.

**Functions:**
- `parseError(error)` - Categorizes errors by type
- `logError(context, error, additionalInfo)` - Logs errors with context
- `getUserFriendlyMessage(error)` - Returns user-friendly error messages
- `safeAsync(fn, context, fallbackValue)` - Safe async wrapper
- `safeSync(fn, context, fallbackValue)` - Safe sync wrapper

**Error Types:**
- `NETWORK_ERROR` - Connection/timeout issues
- `API_ERROR` - Backend API errors
- `VALIDATION_ERROR` - Input validation errors
- `PERMISSION_ERROR` - Permission denied errors
- `CAMERA_ERROR` - Camera/image picker errors
- `UNKNOWN_ERROR` - Unexpected errors

### 3. Camera Helper Utilities
**Location:** `src/utils/cameraHelper.ts`

Safe camera operations with built-in error handling.

**Functions:**
- `requestCameraPermission()` - Safely request camera permission
- `safeLaunchCamera(options)` - Launch camera with error handling
- `getCameraErrorMessage(error)` - Get user-friendly camera error messages

## Implementation Details

### App-Level Protection
**File:** `App.tsx`

- Wrapped entire app with `ErrorBoundary`
- Added try-catch to all FCM notification handlers
- Added error logging to navigation operations
- Prevents crashes from notification handling errors

### API Client Protection
**File:** `src/api/client.ts`

**Improvements:**
- 30-second timeout for all requests
- Better error messages for network failures
- Automatic retry logic for failed requests
- User-friendly error messages

**Error Scenarios Handled:**
- Network timeout (30s)
- Connection failures
- Server errors (4xx, 5xx)
- Invalid responses
- Token expiration (401)

### Screen-Level Protection
**File:** `src/screens/ActiveJobsScreen.tsx`

**Functions Protected:**
- `load()` - Loading active jobs
- `handleSearch()` - Search functionality
- `onRefresh()` - Pull-to-refresh
- `handleCheckoutConfirm()` - Checkout API call
- `formatTime()` - Time formatting

**Error Handling:**
- Shows error dialog for API failures
- Logs all errors with context
- Provides user-friendly error messages
- Graceful fallbacks for data formatting

### FCM/Notification Protection
**File:** `src/services/notificationService.ts`

**Improvements:**
- Graceful handling of `SERVICE_NOT_AVAILABLE` (emulator)
- Non-blocking FCM initialization
- Error logging for all FCM operations
- App continues to work without push notifications

## Error Messages

### Network Errors
- **Timeout:** "Request timeout - server is not responding"
- **Connection Failed:** "Cannot connect to server. Please check your internet connection."

### API Errors
- **Generic:** "An error occurred. Please try again."
- **Specific:** Shows server-provided error message

### Permission Errors
- **Camera:** "Camera permission is required. Please enable it in settings."
- **Generic:** "Permission denied. Please grant the required permissions."

### Camera Errors
- **Generic:** "Camera error. Please try again."
- **Cancelled:** "Camera was cancelled"

## Best Practices Implemented

### 1. Try-Catch Blocks
All async operations wrapped in try-catch:
```typescript
async function load() {
  try {
    setLoading(true);
    const response = await getActiveJobs();
    setJobs(response.jobs || []);
  } catch (error) {
    logError('ActiveJobsScreen.load', error);
    setErrorDialog({
      visible: true,
      message: getUserFriendlyMessage(error),
    });
  } finally {
    setLoading(false);
  }
}
```

### 2. Error Logging
All errors logged with context:
```typescript
logError('ComponentName.functionName', error, {
  additionalInfo: 'relevant data'
});
```

### 3. User Feedback
Always show user-friendly messages:
```typescript
const message = getUserFriendlyMessage(error);
setErrorDialog({ visible: true, message });
```

### 4. Graceful Degradation
App continues to work even if non-critical features fail:
- FCM not available → App works without notifications
- Weather API fails → Shows error icon, app continues
- Image upload fails → Shows error, allows retry

## Testing Error Handling

### Network Errors
1. Turn off internet connection
2. Try to load data
3. Should show: "Cannot connect to server..."

### API Errors
1. Backend returns error
2. Should show server error message
3. User can retry with "Try Again" button

### Permission Errors
1. Deny camera permission
2. Try to take photo
3. Should show: "Camera permission is required..."

### Timeout Errors
1. Slow network connection
2. Request takes >30 seconds
3. Should show: "Request timeout..."

## Future Improvements

### Recommended Additions
1. **Sentry/Crashlytics Integration** - Track errors in production
2. **Offline Mode** - Queue operations when offline
3. **Retry Logic** - Automatic retry for failed requests
4. **Error Analytics** - Track error frequency and types
5. **Custom Error Screens** - Different screens for different error types

### Error Monitoring
Consider adding:
- Error frequency tracking
- User impact analysis
- Automatic error reporting
- Performance monitoring

## Summary

✅ **Implemented:**
- Global error boundary
- Comprehensive error utilities
- API client error handling
- Screen-level error handling
- FCM error handling
- Camera error handling
- User-friendly error messages
- Error logging with context

✅ **Result:**
- No more app crashes
- User-friendly error messages
- Graceful error recovery
- Better debugging with logs
- Improved user experience

## Maintenance

### Adding Error Handling to New Screens
1. Import error utilities:
```typescript
import {logError, getUserFriendlyMessage} from '../utils/errorHandler';
```

2. Wrap async operations:
```typescript
try {
  await someAsyncOperation();
} catch (error) {
  logError('ScreenName.functionName', error);
  showErrorDialog(getUserFriendlyMessage(error));
}
```

3. Add error state:
```typescript
const [error, setError] = useState<string | null>(null);
```

4. Display errors to user:
```tsx
{error && <ErrorDialog message={error} onClose={() => setError(null)} />}
```

### Updating Error Messages
Edit `src/utils/errorHandler.ts` → `parseError()` function to customize error messages for specific scenarios.
