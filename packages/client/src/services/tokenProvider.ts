/**
 * In-memory access token provider for the renderer process.
 * Do NOT persist tokens to disk. Desktop refresh token lives in OS keychain (via Electron main).
 */
let currentToken: string | null = null;

export function setToken(token: string | null) {
  currentToken = token ?? null;
}

export function getToken(): string | null {
  return currentToken;
}

export function clearToken() {
  currentToken = null;
}
