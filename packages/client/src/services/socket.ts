import { io, Socket } from "socket.io-client";
import {
  getToken as getMemToken,
  setToken as setMemToken,
  clearToken as clearMemToken,
} from "./tokenProvider";
import { refreshAccessToken } from "./api";
import { getCurrentApiConfig } from "../utils/apiConfig";

const IS_TEST =
  typeof process !== "undefined" && (process as any)?.env?.NODE_ENV === "test";

let socket: Socket | null = null;

// Single-flight refresh guard for Socket auth failures
let refreshPromise: Promise<string | null> | null = null;
let lastRefreshFailAt = 0;

// Get socket configuration with HTTPS enforcement
const apiConfig = getCurrentApiConfig();
console.log('🔍 Socket Debug - API Config:', {
  socketUrl: apiConfig.socketUrl,
  httpsEnforced: apiConfig.httpsEnforced,
  isProduction: apiConfig.isProduction,
  isDesktop: apiConfig.isDesktop
});

function getApiBase(): string {
  // Use the HTTPS-enforced socket URL from configuration
  return apiConfig.socketUrl;
}

function getStoredToken(): string | null {
  // Prefer in-memory token (desktop). Fallback to persisted for web.
  const mem = getMemToken();
  if (mem) return mem;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token || null;
  } catch {
    return null;
  }
}

export function connectSocket(provideToken?: () => string | null): Socket {
  const baseUrl = getApiBase();
  const token = (provideToken ? provideToken() : null) ?? getStoredToken();

  // Idempotent connect
  if (socket && socket.connected) {
    return socket;
  }

  // Configure transports based on HTTPS enforcement
  const socketOptions: any = {
    transports: ["websocket", "polling"],
    auth: {
      token: token || "",
    },
    autoConnect: true,
  };

  // Enhanced security for HTTPS-enforced connections
  if (apiConfig.httpsEnforced) {
    socketOptions.secure = true; // Force secure connection
    socketOptions.rejectUnauthorized = true; // Validate SSL certificates
    socketOptions.transports = ["websocket"]; // Prefer WebSocket over polling for security
    
    console.log('🔐 Socket: HTTPS enforcement active - using secure WebSocket connection');
  } else {
    // Development mode: force HTTP WebSocket connection
    socketOptions.secure = false; // Force insecure connection for localhost
    socketOptions.transports = ["websocket", "polling"]; // Allow both transports for reliability
    
    console.log('🔓 Socket: Development mode - using insecure WebSocket connection to', baseUrl);
  }

  // Log WebSocket connection security status
  if (apiConfig.isProduction && !baseUrl.startsWith('https://')) {
    console.warn('⚠️  Socket: Production build using insecure WebSocket connection');
  }

  console.log('🔌 Attempting WebSocket connection to:', baseUrl, 'with options:', socketOptions);
  socket = io(baseUrl, socketOptions);

  socket.on("connect", () => {
    console.log('✅ WebSocket connected successfully! Socket ID:', socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log('❌ WebSocket disconnected. Reason:', reason);
  });

  socket.on("connect_error", (error) => {
    console.log('🔥 WebSocket connection error:', error.message, error);
  });

  // Additional connect_error handler for auth token refresh
  socket.on("connect_error", async (error) => {
    // Log the error first
    console.log('🔄 WebSocket auth error, attempting token refresh:', error?.message);
    
    // Avoid hammering refresh if it just failed within 5s
    if (Date.now() - lastRefreshFailAt < 5000) {
      console.log('⚠️ Skipping refresh - too recent');
      return;
    }

    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        setMemToken(newToken);
        if (socket) {
          socket.auth = { ...(socket.auth || {}), token: newToken };
          // If not connected, trigger reconnect with fresh token
          if (!socket.connected) {
            socket.connect();
          }
        }
      } else {
        // Refresh failed — clear token and let app route guards/UI handle re-login
        lastRefreshFailAt = Date.now();
        clearMemToken();
        // Optional: force navigation for immediate UX (skip during tests)
        try {
          if (!IS_TEST && typeof window !== "undefined") {
            try { window.dispatchEvent(new CustomEvent("auth:unauthorized")); } catch {}
            if (window.location.protocol === "file:") {
              window.location.hash = "#/login";
            } else {
              window.location.href = "/login";
            }
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore; allow normal reconnect/backoff
    }
  });

  socket.on("disconnect", () => {
    // console.debug("[socket] disconnected");
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  try {
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }
  } catch {
    // ignore
  }
}
