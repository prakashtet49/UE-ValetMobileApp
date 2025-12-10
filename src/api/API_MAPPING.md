# API Implementation Mapping

This document maps the swagger.json specification to the implemented API functions in the mobile app.

## ✅ Fully Implemented Endpoints

### Authentication (`auth.ts`)
- ✅ `POST /api/v1/auth/send-otp` → `sendOtp()`
- ✅ `POST /api/v1/auth/verify-otp` → `verifyOtp()`
- ✅ `POST /auth/refresh-token` → `refreshAccessToken()`
- ✅ `POST /auth/logout` → `logoutApi()`

### Driver Profile & Location (`driver.ts`)
- ✅ `GET /api/driver/profile` → `getDriverProfile()`
- ✅ `GET /api/driver/client/locations` → `getClientLocations()`
- ✅ `POST /api/driver/location/assign` → `assignLocation()`

### Temporary Access (`driver.ts`)
- ✅ `POST /api/drivers/login` → `tempLogin()`
- ✅ `POST /api/drivers/logout` → `tempLogout()`
- ✅ `POST /api/drivers/{id}/access-token` → `generateAccessToken()`

### Driver Statistics (`stats.ts`)
- ✅ `GET /api/driver/job-stats/today` → `getTodayJobStats()`
- ✅ `GET /api/driver/job-stats/parked-today` → `getParkedToday()`
- ✅ `GET /api/driver/job-stats/delivered-today` → `getDeliveredToday()`

### Jobs (`jobs.ts`)
- ✅ `GET /api/v1/jobs/active` → `getActiveJobs()`
- ✅ `GET /api/v1/jobs/search` → `searchJobs()`
- ✅ `GET /api/v1/jobs/stats` → `getJobsStats()`
- ✅ `GET /api/v1/jobs/{jobId}` → `getJobDetails()`
- ⚠️ `POST /api/v1/jobs/{jobId}/accept` → `acceptJob()` (not in swagger but implemented)
- ⚠️ `POST /api/v1/jobs/{jobId}/decline` → `declineJob()` (not in swagger but implemented)

### Parking (`parking.ts`)
- ✅ `GET /api/driver/parking/pending` → `getPendingParking()`
- ✅ `GET /api/driver/parking/pending/{bookingId}` → `getPendingParkingById()`
- ✅ `POST /api/driver/parking/start` → `startParking()`
- ✅ `POST /api/driver/parking/upload-photos` → `uploadParkingPhotos()`
- ✅ `POST /api/driver/parking/complete` → `completeParking()`
- ✅ `POST /api/driver/parking/send-parking-confirmation` → `sendParkingConfirmationTemplate()`
- ✅ `POST /api/driver/parking/vehicle-arrived` → `markVehicleArrived()`
- ✅ `POST /api/driver/parking/vehicle-handed-over` → `markVehicleHandedOver()`
- ✅ `POST /api/driver/parking/send-vehicle-arrived` → `sendVehicleArrivedTemplate()`
- ✅ `POST /api/driver/parking/send-handover-feedback` → `sendHandoverFeedbackTemplate()`

### Pickup/Delivery (`pickup.ts`)
- ✅ `POST /api/pickup/create` → `createPickupJob()`
- ✅ `GET /api/driver/pickup-requests/new` → `getPendingPickupRequests()`
- ✅ `POST /api/driver/pickup-requests/respond` → `respondToPickupRequest()`
- ✅ `POST /api/driver/pickup-requests/update-status` → `updatePickupStatus()`
- ✅ `GET /api/driver/pickup-requests/{jobId}` → `getPickupJobDetails()`

### Shift Management (`shifts.ts`)
- ✅ `POST /api/v1/shifts/start` → `startShift()`
- ✅ `POST /api/v1/shifts/pause` → `pauseShift()`

### WhatsApp Integration (`whatsapp.ts`)
- ✅ `POST /api/whatsapp/send-parking-confirmation` → `sendParkingConfirmation()`
- ✅ `POST /api/whatsapp/send-driver-arriving` → `sendDriverArriving()`
- ✅ `POST /api/whatsapp/send-delivered` → `sendDeliveredFeedback()`

## 📝 Notes

### Backward Compatibility
All existing API functions have been preserved. No breaking changes were made to:
- Function signatures
- Request/response types
- Endpoint paths
- Authentication requirements

### New Additions
The following new API modules were added:
1. **`driver.ts`** - Driver profile, location management, and temporary access
2. **`index.ts`** - Centralized exports for easier imports

### Usage Example

```typescript
// Old way (still works)
import {sendOtp} from '../api/auth';
import {getActiveJobs} from '../api/jobs';

// New way (recommended)
import {sendOtp, getActiveJobs, getDriverProfile} from '../api';
```

### Missing from Swagger
The following endpoints are implemented but not in swagger.json:
- `POST /api/v1/jobs/{jobId}/accept`
- `POST /api/v1/jobs/{jobId}/decline`

These are kept for backward compatibility and may be used by existing screens.

### Webhook Endpoint
The webhook endpoint is server-side only and not implemented in mobile app:
- `POST /api/webhook/whatsapp` (server receives, not called by mobile)

## 🔧 Configuration

Base URL is configured in `config.ts`:
- Development: `http://localhost:80`
- Production: `http://13.50.218.71:80`

All authenticated endpoints automatically include the JWT Bearer token from AsyncStorage.
