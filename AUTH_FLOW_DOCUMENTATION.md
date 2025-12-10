# Authentication Flow Documentation

## Overview
The Onboarding component now implements a complete authentication flow that handles Google OAuth login, user profile creation, and data persistence to both Supabase and local storage.

## Complete Flow

### 1. **Initial Component Mount**
- Checks if user is already authenticated via `checkAuthStatus()` useEffect
- If user is logged in and profile is complete → navigates directly to (tabs)
- If not authenticated → shows onboarding form with Google sign-in button

### 2. **Google Sign-In Flow**
When user clicks "Continue with Google":

```
User clicks "Continue with Google"
    ↓
signInWithGoogle() executes
    ↓
Check if session already exists
    ├→ If YES: Call checkAndCreateUser()
    │   ├→ If onboarding complete → Navigate to (tabs)
    │   └→ If onboarding incomplete → Show form to complete
    │
    └→ If NO: Start OAuth flow
        ├→ Generate redirect URL (platform-specific)
        ├→ Call supabase.auth.signInWithOAuth()
        ├→ Open browser for Google login
        └→ Auth state subscription handles the rest
```

### 3. **Auth State Change Listener**
After user completes Google OAuth, the `onAuthStateChange` subscription detects `SIGNED_IN` event:

```
SIGNED_IN event received
    ↓
Fetch user data from database
    ↓
Check if onboarding is complete (gender && exam filled)
    ├→ If YES: 
    │   ├→ Save user data to local storage (@user)
    │   ├→ Mark as onboarded (@user_onboarded)
    │   └→ Navigate to (tabs)
    │
    └→ If NO:
        ├→ Populate fullName from Google metadata
        ├→ Clear gender and exam fields
        └→ Show form for user to complete
```

### 4. **Form Completion**
When user fills name, gender, and exam, then clicks "Complete Profile":

```
handleContinue() executes
    ↓
Validate all fields are filled
    ↓
Get current authenticated session
    ↓
Update user record in Supabase:
    - name
    - gender
    - exam
    - updated_at timestamp
    ↓
Save to local storage:
    - @user: {id, email, name, gender, exam, avatar_url}
    - @user_onboarded: 'true'
    ↓
Clear temporary storage
    ↓
Navigate to (tabs)
```

## Data Storage

### Supabase Database (users table)
Stores complete user profile:
- `id` (UUID) - Auth user ID
- `email` - User's Google email
- `name` - Full name
- `gender` - Selected gender (Male/Female/Other)
- `exam` - Selected exam (JEE Mains/NEET/JEE Advanced/Other)
- `avatar_url` - User's Google profile picture
- `created_at` - Account creation timestamp
- `updated_at` - Last profile update timestamp

### Local Storage (AsyncStorage)
Quick access cache:

```javascript
@user: {
  id: string,
  email: string,
  name: string,
  gender: string,
  exam: string,
  avatar_url: string
}

@user_onboarded: 'true'
```

## Key Improvements

1. **Email Persistence**: Email is now properly stored in both Supabase and local storage after onboarding completes
2. **Onboarding Validation**: Distinguishes between new users and returning users with incomplete profiles
3. **Error Handling**: Comprehensive error handling with user-friendly alerts
4. **Logging**: Detailed console logs for debugging the auth flow
5. **Platform Support**: Handles both web and mobile/Expo platforms correctly
6. **Data Consistency**: Ensures data is synchronized across database and local cache

## User Journeys

### New User Journey
```
App Opens
    ↓
Show Onboarding Screen
    ↓
Click "Continue with Google"
    ↓
Google OAuth in Browser
    ↓
Auth State Change → User created in database
    ↓
Form displayed with pre-filled name
    ↓
Complete: Fill gender + exam
    ↓
Click "Complete Profile"
    ↓
Profile saved to Supabase & AsyncStorage
    ↓
Navigate to (tabs)
```

### Returning User (Already Onboarded)
```
App Opens
    ↓
Check auth status
    ↓
User found with complete profile
    ↓
Load from local storage
    ↓
Navigate directly to (tabs)
```

### Returning User (Incomplete Profile)
```
App Opens
    ↓
Check auth status
    ↓
User found but missing gender/exam
    ↓
Show form with pre-filled name
    ↓
User completes form
    ↓
Save and navigate to (tabs)
```
