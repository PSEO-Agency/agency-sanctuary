
# Fix: Google OAuth Redirect to Custom Domain

## Problem Summary
When users log in with Google, they sometimes land on the Lovable preview URL (`lovableproject.com`) instead of your custom domain (`app.pseo.nl` or `staging.app.pseo.nl`). This happens because the OAuth redirect URL uses `window.location.origin`, which resolves to whatever domain the user is currently on.

## Solution Overview
Implement custom domain detection that bypasses Lovable's auth-bridge for custom domains, ensuring users always return to the correct domain after Google authentication.

## Implementation Steps

### Step 1: Update Google Sign-In Logic
Modify the `signInWithGoogle` function in `AuthContext.tsx` to:

1. **Detect if user is on a custom domain** (not on `lovable.app` or `lovableproject.com`)
2. **For custom domains**: Use `skipBrowserRedirect: true` to get the OAuth URL directly, then manually redirect - this bypasses the auth-bridge
3. **For Lovable domains**: Keep the existing behavior (auth-bridge handles it correctly)

### Step 2: Add Domain Detection Helper
Create a utility to determine if the current hostname is a custom domain:
- Check if hostname does NOT contain `lovable.app` or `lovableproject.com`
- If it's a custom domain, use the direct OAuth flow

### Step 3: Security Validation
Add URL validation before redirecting to the OAuth provider to prevent open redirect vulnerabilities:
- Validate that the OAuth URL points to an expected host (Google's OAuth server)

## Code Changes

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Update `signInWithGoogle` function to detect custom domains and bypass auth-bridge when needed |

## Technical Details

```text
Current Flow (problematic):
┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐
│ User clicks │ -> │ OAuth starts │ -> │ Redirects to origin │
│  Google     │    │ with origin  │    │ (lovableproject.com)│
└─────────────┘    └──────────────┘    └─────────────────────┘

Fixed Flow:
┌─────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│ User clicks │ -> │ Check if custom  │ -> │ If custom domain:   │
│  Google     │    │ domain           │    │ skipBrowserRedirect │
└─────────────┘    └──────────────────┘    │ + manual redirect   │
                                           └─────────────────────┘
```

## Important: Backend Configuration Required
After implementing the code fix, you must also add your custom domains to the authentication redirect URLs in your backend settings:

- Add `https://app.pseo.nl/**` to allowed redirect URLs
- Add `https://staging.app.pseo.nl/**` to allowed redirect URLs

This can be done in Cloud View → Users → Authentication Settings.

## Testing Plan
1. Test Google login from `app.pseo.nl` - should return to `app.pseo.nl`
2. Test Google login from `staging.app.pseo.nl` - should return to `staging.app.pseo.nl`  
3. Test Google login from Lovable preview - should continue to work normally
