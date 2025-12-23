# Valet Billing Login Flow Documentation

## Overview

The valet billing role uses a **password-based authentication** flow instead of OTP. This document explains the complete implementation.

---

## API Endpoints

### 1. Send OTP API
**Endpoint:** `POST /api/v1/auth/send-otp`

**Request:**
```json
{
  "phone": "9121861520"
}
```

**Response for Valet Billing:**
```json
{
  "message": "OTP sent successfully",
  "sessionId": "session-id-here",
  "role": "valet_billing"  // ← Key field that triggers password flow
}
```

**Response for Other Roles:**
```json
{
  "message": "OTP sent successfully",
  "sessionId": "session-id-here"
  // No role field or role is "valet", "client_admin", etc.
}
```

---

### 2. Login with Password API (Valet Billing Only)
**Endpoint:** `POST /api/v1/auth/login-password`

**Request:**
```json
{
  "phone": "9121861520",
  "password": "Prakash@anvaron"
}
```

**Response:**
```json
{
  "accessToken": "jwt-token-here",
  "refreshToken": "refresh-token-here",
  "expiresIn": 3600,
  "user": {
    "id": "user-id",
    "phone": "9121861520",
    "role": "valet_billing"
  }
}
```

---

### 3. Verify OTP API (Other Roles)
**Endpoint:** `POST /api/v1/auth/verify-otp`

**Request:**
```json
{
  "phone": "9121861520",
  "token": "1234"
}
```

**Response:**
```json
{
  "accessToken": "jwt-token-here",
  "refreshToken": "refresh-token-here",
  "expiresIn": 3600,
  "user": {
    "id": "user-id",
    "phone": "9121861520",
    "role": "valet"
  }
}
```

---

## Login Flow

### For Valet Billing Users:

```
1. User enters phone number
   ↓
2. Tap "Continue with OTP"
   ↓
3. App calls: POST /api/v1/auth/send-otp
   ↓
4. Backend responds with role: "valet_billing"
   ↓
5. App shows password field (phone becomes read-only)
   ↓
6. User enters password
   ↓
7. Tap "Login"
   ↓
8. App calls: POST /api/v1/auth/login-password
   ↓
9. Backend validates password and returns tokens
   ↓
10. User logged in to Billing Dashboard
```

### For Other Users (Valet, Admin):

```
1. User enters phone number
   ↓
2. Tap "Continue with OTP"
   ↓
3. App calls: POST /api/v1/auth/send-otp
   ↓
4. Backend responds without role or with role: "valet"
   ↓
5. App navigates to OTP verification screen
   ↓
6. User enters 4-digit OTP
   ↓
7. Tap "Verify"
   ↓
8. App calls: POST /api/v1/auth/verify-otp
   ↓
9. Backend validates OTP and returns tokens
   ↓
10. User logged in to Home/Dashboard
```

---

## Implementation Details

### Files Modified:

1. **`src/api/auth.ts`**
   - Added `LoginWithPasswordRequest` type
   - Added `LoginWithPasswordResponse` type
   - Added `loginWithPassword()` function
   - Updated `SendOtpResponse` to include optional `role` field

2. **`src/context/AuthContext.tsx`**
   - Added `loginWithPasswordAuth()` function
   - Calls `/api/v1/auth/login-password` endpoint
   - Stores session and tokens same as OTP flow
   - Added to AuthContext provider value

3. **`src/screens/LoginScreen.tsx`**
   - Added `password` state
   - Added `showPasswordField` state
   - Added `userRole` state
   - Detects `role: "valet_billing"` in send OTP response
   - Shows password field conditionally
   - Makes phone number read-only when password shown
   - Added `onLoginWithPassword()` handler

4. **`src/screens/OtpVerificationScreen.tsx`**
   - Accepts `password` and `isPasswordLogin` params
   - Shows loading screen for password login
   - Calls `loginWithPasswordAuth()` for password flow
   - Calls `loginWithPhoneOtp()` for OTP flow

5. **`src/navigation/AppNavigator.tsx`**
   - Updated `OtpVerification` route params
   - Added optional `password` and `isPasswordLogin` fields

---

## UI/UX Flow

### Login Screen - Before Password Field:
```
┌─────────────────────────────────┐
│      Driver Login               │
│                                 │
│  Phone number                   │
│  ┌───────────────────────────┐ │
│  │ 9121861520                │ │
│  └───────────────────────────┘ │
│                                 │
│  [Continue with OTP]            │
│                                 │
│  [Login with Temporary Token]  │
└─────────────────────────────────┘
```

### Login Screen - After Detecting Valet Billing:
```
┌─────────────────────────────────┐
│      Driver Login               │
│                                 │
│  Phone number                   │
│  ┌───────────────────────────┐ │
│  │ 9121861520         (gray) │ │ ← Read-only
│  └───────────────────────────┘ │
│                                 │
│  Password                       │
│  ┌───────────────────────────┐ │
│  │ ••••••••••••              │ │ ← Secure input
│  └───────────────────────────┘ │
│                                 │
│  [Login]                        │
└─────────────────────────────────┘
```

### OTP Verification Screen - Password Login:
```
┌─────────────────────────────────┐
│      Logging In                 │
│                                 │
│  Please wait while we verify    │
│  your credentials...            │
│                                 │
│         ⟳ Loading...            │
│                                 │
└─────────────────────────────────┘
```

---

## Security Considerations

1. **Password is masked** using `secureTextEntry`
2. **Phone number is read-only** after role detection
3. **Password sent over HTTPS** to `/api/v1/auth/login-password`
4. **No password stored** in app state after navigation
5. **Same token storage** as OTP flow (secure AsyncStorage)

---

## Testing

### Test Valet Billing Login:
1. Enter phone number: `9121861520`
2. Tap "Continue with OTP"
3. Verify password field appears
4. Verify phone number is grayed out
5. Enter password: `Prakash@anvaron`
6. Tap "Login"
7. Verify loading screen appears
8. Verify successful login to Billing Dashboard

### Test Normal Valet Login:
1. Enter phone number: `9876543210`
2. Tap "Continue with OTP"
3. Verify navigation to OTP screen
4. Enter 4-digit OTP
5. Tap "Verify"
6. Verify successful login to Home

---

## Backend Requirements

The backend must:

1. **Return `role` field in send OTP response** for valet_billing users
2. **Implement `/api/v1/auth/login-password` endpoint**
3. **Validate password** and return same response structure as verify-otp
4. **Return proper error messages** for invalid credentials

---

## Error Handling

- Invalid password → Show error dialog
- Network error → Show network error message
- Server error → Show server error message
- All errors logged to console with `[Auth]` prefix

---

## Future Enhancements

1. Add "Forgot Password" flow for valet_billing
2. Add password strength indicator
3. Add "Show/Hide Password" toggle
4. Add biometric authentication option
5. Add remember device feature
