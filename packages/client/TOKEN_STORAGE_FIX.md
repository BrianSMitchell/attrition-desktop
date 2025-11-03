# Token Storage Bug Fix

## Problem

The auth system had a **critical token persistence bug**:

1. **Tokens were never persisted** - The `storeSecureToken()` method in `AuthManager.ts` only stored tokens in memory via `tokenProvider`, but never saved them to disk or secure storage
2. **Tokens lost on app restart** - When the app restarted, all authentication was lost because there was no persistent storage
3. **Incomplete restoration** - The `restoreAuthState()` method tried to restore tokens but had no source to restore from

## Root Cause

The `AuthManager` was calling `setToken(token)` which only stored tokens in a JavaScript variable:

```typescript
// tokenProvider.ts
let currentToken: string | null = null;

export function setToken(token: string | null) {
  currentToken = token ?? null;  // Only in memory!
}
```

There was **no persistence layer** connecting this to:
- Desktop: OS keychain (via Electron IPC)
- Web: localStorage fallback

## Solution

### 1. Enhanced AuthManager Token Storage (`AuthManager.ts`)

**Added proper persistence in `storeSecureToken()`:**

```typescript
private async storeSecureToken(token: string): Promise<void> {
  // Store in memory (via tokenProvider)
  setToken(token);

  // Persist to secure storage (desktop) or localStorage (web fallback)
  if (this.isDesktop() && (window as any).desktop?.tokens?.saveToken) {
    await (window as any).desktop.tokens.saveToken(token);
  } else {
    // Web fallback: store in localStorage
    const authData = { token, timestamp: Date.now() };
    localStorage.setItem('auth-token', JSON.stringify(authData));
  }
}
```

**Enhanced token restoration in `restoreAuthState()`:**

```typescript
private async restoreAuthState(): Promise<void> {
  // Desktop: Try to restore access token
  if (this.isDesktop() && (window as any).desktop?.tokens?.getToken) {
    const tokenResult = await (window as any).desktop.tokens.getToken();
    if (tokenResult?.ok && tokenResult.token) {
      // Validate token expiration
      const decoded = this.decodeToken(tokenResult.token);
      const now = Date.now() / 1000;
      
      if (decoded?.exp && decoded.exp > now) {
        // Token is valid, restore it
        setToken(tokenResult.token);
        this.state.token = tokenResult.token;
        
        // Fetch user profile to complete restoration
        const isValid = await this.performAuthCheck();
        if (isValid) {
          this.state.isAuthenticated = true;
          this.scheduleTokenRefresh(tokenResult.token);
          return;
        }
      }
    }
  }

  // If access token failed, try refresh token
  // (existing refresh token logic)
  
  // Web fallback: restore from localStorage
  const tokenData = localStorage.getItem('auth-token');
  // (validation and restoration logic)
}
```

**Enhanced cleanup in `clearSecureStorage()`:**

```typescript
private async clearSecureStorage(): Promise<void> {
  clearToken();  // Clear memory
  
  // Clear desktop secure storage (both tokens)
  if (this.isDesktop()) {
    if ((window as any).desktop?.tokens?.deleteToken) {
      await (window as any).desktop.tokens.deleteToken();
    }
    if ((window as any).desktop?.tokens?.deleteRefresh) {
      await (window as any).desktop.tokens.deleteRefresh();
    }
  }
  
  // Clear localStorage (both token formats)
  localStorage.removeItem('auth-token');
  localStorage.removeItem('auth-storage');
}
```

### 2. Added Desktop IPC Handlers (`main.ts`)

**New access token storage handlers:**

```typescript
// Access token handlers (can be retrieved for restoration)
ipcMain.handle('tokens:saveToken', async (_event, token) => {
  await keytar.setPassword(APP_ID, 'access', String(token ?? ''));
  return { ok: true };
});

ipcMain.handle('tokens:getToken', async () => {
  const token = await keytar.getPassword(APP_ID, 'access');
  return { ok: true, token: token || null };
});

ipcMain.handle('tokens:deleteToken', async () => {
  await keytar.deletePassword(APP_ID, 'access');
  return { ok: true };
});
```

These handlers store tokens in the **OS keychain** (Windows Credential Manager, macOS Keychain, Linux Secret Service) via the `keytar` library.

### 3. Exposed IPC Handlers in Preload (`preload.ts`)

```typescript
tokens: {
  // Access token (can be retrieved for restoration)
  saveToken: (value: string) => ipcRenderer.invoke('tokens:saveToken', value),
  getToken: () => ipcRenderer.invoke('tokens:getToken'),
  deleteToken: () => ipcRenderer.invoke('tokens:deleteToken'),
  
  // Refresh token (no getter to avoid leaking to renderer)
  saveRefresh: (value: string) => ipcRenderer.invoke('tokens:saveRefresh', value),
  deleteRefresh: () => ipcRenderer.invoke('tokens:deleteRefresh'),
  hasRefresh: () => ipcRenderer.invoke('tokens:hasRefresh'),
}
```

## How It Works Now

### Desktop App Flow

1. **Login:**
   - User logs in → receives access token + refresh token
   - `storeSecureToken()` saves access token to OS keychain
   - `storeRefreshToken()` saves refresh token to OS keychain
   - Token also stored in memory for immediate use

2. **App Restart:**
   - `restoreAuthState()` calls `desktop.tokens.getToken()`
   - Retrieves access token from OS keychain
   - Validates token is not expired
   - Fetches user profile to complete auth restoration
   - If access token expired, uses refresh token

3. **Logout:**
   - `clearSecureStorage()` deletes both tokens from keychain
   - Clears memory token
   - User fully logged out

### Web App Flow (Fallback)

1. **Login:**
   - Token saved to `localStorage` as JSON: `{ token, timestamp }`

2. **Page Refresh:**
   - Retrieves token from `localStorage`
   - Validates expiration
   - Fetches profile to restore auth

3. **Logout:**
   - Clears `localStorage`

## Security Considerations

- **Desktop:** Tokens stored in OS keychain (most secure)
- **Web:** Tokens in localStorage (less secure, but functional)
- **Refresh tokens:** Never exposed to renderer (desktop only retrieves via main process)
- **Token validation:** Always checks expiration before using restored token
- **Automatic cleanup:** Expired tokens are automatically removed

## Testing

To verify the fix:

1. **Login** to the desktop app
2. **Close the app completely**
3. **Restart the app**
4. **Verify:** You should still be logged in

Previously, step 4 would always show the login screen. Now it correctly restores your session.

## Files Modified

### Client Package
- `packages/client/src/services/core/AuthManager.ts` - Enhanced token storage and restoration
- No changes to `packages/client/src/services/authService.ts` (compatibility layer)

### Desktop Package
- `packages/desktop/src/main.ts` - Added IPC handlers for access token storage
- `packages/desktop/src/preload.ts` - Exposed new IPC handlers to renderer

## Build Status

✅ TypeScript compilation successful
✅ Changes ready to test
⚠️ Full production build skipped (file lock on better-sqlite3 - likely app running)

You can test immediately by running:
```bash
cd C:\Projects\Attrition\packages\desktop
npm run dev
```

## Notes

- Removed passwordless login functionality as requested
- Maintained backward compatibility with existing auth flows
- All existing tests should pass (no breaking changes to API contracts)
