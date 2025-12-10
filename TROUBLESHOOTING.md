# Troubleshooting Guide

## Token Login 500 Error

### Error Details
```
Status: 500
Error: proxy_error
Message: Error
Endpoint: POST /api/drivers/login
```

### Root Cause
The backend server is returning a 500 Internal Server Error with `proxy_error`. This indicates:

1. **Backend endpoint may not be implemented yet**
2. **Proxy/gateway configuration issue on the server**
3. **Backend service is down or unreachable**

### Solutions

#### Option 1: Verify Backend Implementation
Contact the backend team to confirm:
- Is `/api/drivers/login` endpoint implemented?
- What is the expected request format?
- Are there any authentication requirements?

Expected Request (per swagger.json):
```json
POST /api/drivers/login
Content-Type: application/json

{
  "code": "TOKEN_VALUE"
}
```

Expected Response:
```json
{
  "ok": true,
  "session": {
    "auth_type": "temp",
    "role": "valet",
    "driver_id": "uuid"
  }
}
```

#### Option 2: Check Server Logs
Ask backend team to check server logs for:
- Incoming request details
- Proxy error details
- Stack trace or error messages

#### Option 3: Test with Postman/cURL
Test the endpoint directly:

```bash
curl -X POST http://13.50.218.71:80/api/drivers/login \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST_TOKEN"}'
```

#### Option 4: Use Alternative Endpoint (Temporary)
If the endpoint isn't ready, you can temporarily use the phone OTP flow:
1. Navigate to Login screen
2. Use "Continue with OTP" instead
3. Enter phone number and verify OTP

#### Option 5: Mock Implementation (Development Only)
For local development, you can temporarily mock the response in `AuthContext.tsx`:

```typescript
// TEMPORARY - Remove when backend is ready
async function loginWithTempToken(token: string): Promise<boolean> {
  setLoading(true);
  setError(null);
  try {
    // Mock successful login for development
    if (token === 'DEV123' || token.length >= 6) {
      await setStoredTokens(token);
      setSession({
        accessToken: token,
        driverName: 'Test Driver',
      });
      return true;
    }
    setError('Invalid token');
    return false;
  } finally {
    setLoading(false);
  }
}
```

### Current Implementation
The app now shows a user-friendly error message:
> "Server error. The login service may be temporarily unavailable. Please try again later or contact support."

### Next Steps
1. ✅ Verify backend endpoint is deployed and accessible
2. ✅ Test endpoint with Postman/cURL
3. ✅ Check server logs for detailed error
4. ✅ Confirm request/response format matches swagger spec
5. ✅ Ensure no authentication is required for this endpoint (it's a login endpoint)

### Contact
If the issue persists, contact:
- Backend Team: Verify endpoint implementation
- DevOps Team: Check proxy/gateway configuration
- API Documentation: Confirm swagger spec is up to date
