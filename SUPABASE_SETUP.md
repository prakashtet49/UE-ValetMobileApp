# Supabase Setup for WebSocket Authentication

## Overview

The WebSocket connection now uses **Supabase tokens** for authentication instead of the login tokens. This provides better security and session management.

## Setup Steps

### 1. Get Your Supabase Credentials

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 2. Update Supabase Configuration

Open `/src/lib/supabase.ts` and replace the placeholder values:

```typescript
const SUPABASE_URL = 'https://your-actual-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-actual-anon-key-here';
```

### 3. How It Works

The WebSocket hook now follows this token priority:

1. **First**: Try to get Supabase session token
   ```typescript
   const token = await getSupabaseToken();
   ```

2. **Fallback**: If no Supabase token, use stored login token
   ```typescript
   const {accessToken} = await getStoredTokens();
   ```

3. **Fail**: If neither exists, skip WebSocket connection

## Token Flow

### When User Logs In

Your app should authenticate with Supabase after successful login:

```typescript
// After successful login
import {supabase} from '../lib/supabase';

// Sign in with Supabase using the login token or credentials
await supabase.auth.signInWithPassword({
  email: userEmail,
  password: userPassword,
});

// OR sign in with a custom token
await supabase.auth.setSession({
  access_token: loginAccessToken,
  refresh_token: loginRefreshToken,
});
```

### WebSocket Connection

The WebSocket will automatically:
1. Get the Supabase session token
2. Use it for authentication
3. Auto-refresh when the token expires

## Console Logs

You'll now see which token source is being used:

```
[WebSocket] ✓ Token retrieved successfully
[WebSocket] Token source: Supabase
[WebSocket] Token preview: eyJhbGciOiJIUzI1NiI...
```

Or if falling back:

```
[WebSocket] No Supabase token, trying stored login token...
[WebSocket] ✓ Token retrieved successfully
[WebSocket] Token source: Login (AsyncStorage)
[WebSocket] Token preview: eyJpc3MiOiJodHRwczovL...
```

## Integration with Auth Context

You may want to update your `AuthContext.tsx` to also manage Supabase sessions:

```typescript
import {supabase} from '../lib/supabase';

async function loginWithPhoneOtp(phone: string, otp: string) {
  setLoading(true);
  try {
    // Your existing login
    const response = await verifyOtp({phone, token: otp});
    await setStoredTokens(response.accessToken, response.refreshToken);

    // Also sign in to Supabase
    await supabase.auth.setSession({
      access_token: response.accessToken,
      refresh_token: response.refreshToken,
    });

    setSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      driverName: response.user.role === 'valet' ? 'Valet Driver' : response.user.role,
    });
  } finally {
    setLoading(false);
  }
}

async function logout() {
  setSession(null);
  await clearStoredTokens();
  
  // Also sign out from Supabase
  await supabase.auth.signOut();
}
```

## Troubleshooting

### Issue: Still getting "Unauthorized"

**Check**:
1. Supabase URL and key are correct in `/src/lib/supabase.ts`
2. User is signed in to Supabase
3. Supabase session is valid (not expired)

**Test Supabase Session**:
```typescript
import {supabase} from '../lib/supabase';

const {data: {session}} = await supabase.auth.getSession();
console.log('Supabase session:', session);
console.log('Access token:', session?.access_token);
```

### Issue: No Supabase token found

**Solution**: Make sure to sign in to Supabase after your app's login:

```typescript
// After successful login
await supabase.auth.setSession({
  access_token: yourLoginToken,
  refresh_token: yourRefreshToken,
});
```

### Issue: Token expires quickly

**Solution**: Supabase automatically refreshes tokens. Make sure:
- `autoRefreshToken: true` is set in supabase config (already done)
- Your app stays connected to the network

## Backend Requirements

Your WebSocket server should accept Supabase JWT tokens. The token will have this structure:

```json
{
  "iss": "https://your-project.supabase.co/auth/v1",
  "sub": "user-uuid",
  "aud": "authenticated",
  "exp": 1234567890,
  "iat": 1234567890,
  "email": "user@example.com",
  "role": "authenticated"
}
```

Verify the token using Supabase's JWT secret (found in your Supabase project settings).

## Benefits of Using Supabase Tokens

1. **Auto-refresh**: Tokens refresh automatically
2. **Better security**: Supabase manages token lifecycle
3. **Consistent auth**: Same token for REST API and WebSocket
4. **Session management**: Built-in session handling
5. **Token validation**: Easy to verify on backend

## Next Steps

1. ✅ Install Supabase: `npm install @supabase/supabase-js` (already done)
2. ⚠️ Update Supabase credentials in `/src/lib/supabase.ts`
3. ⚠️ Integrate Supabase sign-in with your login flow
4. ⚠️ Update backend to accept Supabase JWT tokens
5. ✅ Test WebSocket connection with new token

## Need Help?

If you're still getting "Unauthorized" errors:
1. Check the console logs to see which token source is being used
2. Verify the token is valid by testing it with a REST API call
3. Contact your backend team to confirm they accept Supabase tokens
4. Check the `WEBSOCKET_TROUBLESHOOTING.md` file for more debugging steps
