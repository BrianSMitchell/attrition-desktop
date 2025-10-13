import axios, {
import { ERROR_MESSAGES } from '../../server/src/constants/response-formats';
import { ENV_VALUES } from '@shared/constants/configuration-keys';

import { HTTP_STATUS } from '@shared/response-formats';
import { TIMEOUTS } from '@shared/constants/magic-numbers';
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { attachMetrics } from "./httpInstrumentation";
import { getToken, setToken, clearToken } from "./tokenProvider";
import { getCurrentApiConfig } from "../utils/apiConfig";

const IS_TEST =
  typeof process !== "undefined" && (process as any)?.env?.NODE_ENV === ENV_VALUES.TEST;

// Get API configuration with HTTPS enforcement
const apiConfig = getCurrentApiConfig();
export const API_BASE_URL: string = apiConfig.apiUrl;

// Log HTTPS enforcement status
if (apiConfig.httpsEnforced) {
  console.log('?? API Service: HTTPS enforcement active for production build');
} else if (apiConfig.isProduction && !apiConfig.apiUrl.startsWith('https://')) {
  console.warn('??  API Service: Production build using HTTP - HTTPS recommended');
}

// Public ApiError shape for callers/UI
export interface ApiError {
  code: string; // e.g., 'INVALID_REQUEST', 'HTTP_500', 'NETWORK_ERROR', 'TIMEOUT', 'UNAUTHORIZED'
  message: string;
  status?: number;
  details?: any;
}

// Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUTS.TEN_SECONDS,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach dev-only HTTP metrics
attachMetrics(api, "api");

// Optional request id generator (simple, no deps)
function createRequestId(): string {
  // time-base + random suffix
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type RetriableConfig = InternalAxiosRequestConfig & {
  _retry401?: boolean;
  _retriedOnce?: boolean;
};

// Inject Authorization and x-request-id (axios v1 headers support set/get)
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();

  // Ensure headers exists and handle AxiosHeaders vs plain object
  const h: any = config.headers ?? {};
  if (token) {
    if (typeof h.set === "function") {
      h.set("Authorization", `Bearer ${token}`);
    } else {
      h["Authorization"] = `Bearer ${token}`;
    }
  }

  const existingReqId =
    (typeof h.get === "function" ? h.get("x-request-id") : h["x-request-id"]) ||
    undefined;
  if (!existingReqId) {
    const rid = createRequestId();
    if (typeof h.set === "function") {
      h.set("x-request-id", rid);
    } else {
      h["x-request-id"] = rid;
    }
  }

  config.headers = h;
  return config;
});

// Single-flight 401 refresh machinery
let refreshPromise: Promise<string | null> | null = null;

export let refreshAccessToken: () => Promise<string | null> = async () => {
  try {
    const refreshFn = (window as any)?.desktop?.auth?.refresh as
      | (() => Promise<{
          ok: boolean;
          token?: string;
          error?: string;
          status?: number;
          details?: any;
        }>)
      | undefined;

    if (!refreshFn) return null;

    const res = await refreshFn();
    if (res && res.ok && res.token) {
      setToken(res.token);
      return res.token;
    }
    return null;
  } catch {
    return null;
  }
};


export function toApiErrorFromAxiosError(error: AxiosError): ApiError {
  // HTTP response present
  if (error.response) {
    const status = error.response.status;
    const payload: any = error.response.data;

    // Prefer canonical server DTO (success:false)
    if (payload && payload.success === false) {
      return {
        code: payload.code || "SERVER_ERROR",
        message: payload.message || "Request failed",
        details: payload.details ?? payload,
        status,
      };
    }

    // Fallback: HTTP_{status} + message
    return {
      code: `HTTP_${status}`,
      message:
        (payload && (payload.message || payload.error)) ||
        error.response.statusText ||
        "HTTP Error",
      details: payload,
      status,
    };
  }

  // No response: timeout or network
  // Axios sets error.code === 'ECONNABORTED' on timeout
  const codeVal = (error as any)?.code;
  const msgVal = (error as any)?.message;
  if (
    codeVal === "ECONNABORTED" ||
    (typeof msgVal === "string" && msgVal.toLowerCase().includes("timeout"))
  ) {
    return {
      code: "TIMEOUT",
      message: "Request timed out",
    };
  }

  return {
    code: "NETWORK_ERROR",
    message: ERROR_MESSAGES.NETWORK_ERROR,
  };
}

// Small helper to robustly coerce a value to a non-negative integer
function toNonNegativeInt(v: any, fallback = 0): number {
  const n = Number(v);
  if (!isFinite(n) || isNaN(n)) return fallback;
  return n < 0 ? 0 : Math.floor(n);
}

// Normalize empire shape to ensure resources are always present
function ensureEmpireResources(empire: any): any {
  if (!empire || typeof empire !== 'object') return empire;
  const res = empire.resources ?? {};
  const credits = toNonNegativeInt(res.credits, 0);
  return {
    ...empire,
    resources: { credits },
  };
}

// Deep-ish normalization for common payload shapes the app uses
function normalizeSuccessPayload(resp: AxiosResponse): void {
  const body: any = resp?.data;
  if (!body || body.success === false) return;

  // Top-level empire (e.g., auth payloads returning { empire })
  if (body.empire) {
    body.empire = ensureEmpireResources(body.empire);
  }

  // Common API envelope: { success, data: {...} }
  if (body.data && typeof body.data === 'object') {
    if (body.data.empire) {
      body.data.empire = ensureEmpireResources(body.data.empire);
    }
    // Dashboard often nests empire at data.dashboard.empire
    if (body.data.dashboard && body.data.dashboard.empire) {
      body.data.dashboard.empire = ensureEmpireResources(body.data.dashboard.empire);
    }
  }
}

// Response path: normalize server-declared failures even when HTTP 200
api.interceptors.response.use(
  (resp: AxiosResponse) => {
    const data = resp?.data;
    if (data && data.success === false) {
      const normalized: ApiError = {
        code: data.code || "SERVER_ERROR",
        message: data.message || "Request failed",
        details: data.details,
        status: resp.status,
      };
      return Promise.reject(normalized);
    }

    // Normalize successful payloads to ensure consistent empire.resources shape
    try { normalizeSuccessPayload(resp); } catch {}

    return resp;
  },
  async (error: any) => {
    // Ensure AxiosError typing when possible
    const axErr: AxiosError = error;

    // Early TIMEOUT mapping for transport-level timeouts (no HTTP response)
    if (
      !(axErr as any)?.response &&
      (
        (axErr as any)?.code === "ECONNABORTED" ||
        (typeof (axErr as any)?.message === "string" &&
          (axErr as any).message.toLowerCase().includes("timeout"))
      )
    ) {
      return Promise.reject<ApiError>({
        code: "TIMEOUT",
        message: "Request timed out",
      });
    }

    // 401 handling with single-flight refresh
    const status = axErr?.response?.status;
    const cfg = (axErr?.config || {}) as RetriableConfig;

    if (status === 401) {
      // Prevent infinite loops only after we've already replayed once
      if ((cfg as any)._retry401Replayed) {
        clearToken();
        if (!IS_TEST && typeof window !== "undefined") {
          try {
            // Notify app-wide auth layer to clear any persisted user before navigating
            try { window.dispatchEvent(new CustomEvent("auth:unauthorized")); } catch {}
            if (window.location.protocol === "file:") {
              window.location.hash = "#/login";
            } else {
              window.location.href = "/login";
            }
          } catch {
            // noop
          }
        }
        return Promise.reject<ApiError>({
          code: "UNAUTHORIZED",
          message: "Session expired",
          status: HTTP_STATUS.UNAUTHORIZED,
        });
      }

      // Single-flight refresh
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        // Replay original request once with new token
        const nextCfg: any = {
          ...cfg,
          _retry401: true,
          _retry401Replayed: true,
          headers: { ...(cfg.headers || {}), Authorization: `Bearer ${newToken}` },
        };
        try {
          return await api.request(nextCfg);
        } catch (replayErr) {
          // If replay fails, surface normalized error
          const norm =
            axios.isAxiosError(replayErr)
              ? toApiErrorFromAxiosError(replayErr)
              : ({
                  code: "NETWORK_ERROR",
                  message: ERROR_MESSAGES.NETWORK_ERROR,
                } as ApiError);
          return Promise.reject(norm);
        }
      } else {
        // Refresh failed - clear and send to login
        clearToken();
        if (!IS_TEST && typeof window !== "undefined") {
          try {
            // Notify app-wide auth layer to clear any persisted user before navigating
            try { window.dispatchEvent(new CustomEvent("auth:unauthorized")); } catch {}
            if (window.location.protocol === "file:") {
              window.location.hash = "#/login";
            } else {
              window.location.href = "/login";
            }
          } catch {
            // noop
          }
        }
        return Promise.reject<ApiError>({
          code: "UNAUTHORIZED",
          message: "Session expired",
          status: HTTP_STATUS.UNAUTHORIZED,
        });
      }
    }

    // Optional: one retry for GET on transient errors (no 401)
    const method = ((cfg.method || "get") as string).toLowerCase();
    const transientStatus = axErr?.response?.status;
    const isTransientHttp =
      transientStatus === 502 ||
      transientStatus === 503 ||
      transientStatus === 504;
    const isNetworkLike =
      !axErr?.response &&
      (((axErr as any)?.code === "ECONNABORTED") ||
        (typeof axErr?.message === "string" &&
          axErr.message.toLowerCase().includes("network")));

    if (
      method === "get" &&
      !cfg._retriedOnce &&
      (isTransientHttp || isNetworkLike)
    ) {
      cfg._retriedOnce = true;
      // brief backoff
      await new Promise((r) => setTimeout(r, 200));
      try {
        return await api.request(cfg);
      } catch (retryErr) {
        const r = retryErr as any;
        const norm =
          axios.isAxiosError(retryErr)
            ? toApiErrorFromAxiosError(retryErr)
            : (r?.code === "ECONNABORTED" ||
                (typeof r?.message === "string" &&
                  r.message.toLowerCase().includes("timeout")))
            ? ({ code: "TIMEOUT", message: "Request timed out" } as ApiError)
            : ({ code: "NETWORK_ERROR", message: ERROR_MESSAGES.NETWORK_ERROR } as ApiError);
        return Promise.reject(norm);
      }
    }

    // Normalize remaining errors
    const normalized: ApiError = axios.isAxiosError(axErr)
      ? toApiErrorFromAxiosError(axErr)
      : ((axErr as any)?.code === "ECONNABORTED" ||
          (typeof (axErr as any)?.message === "string" &&
            (axErr as any).message.toLowerCase().includes("timeout")))
        ? { code: "TIMEOUT", message: "Request timed out" }
        : { code: "NETWORK_ERROR", message: ERROR_MESSAGES.NETWORK_ERROR };

return Promise.reject(normalized);
  }
);

// --- Convenience API helpers ---
export async function getCreditHistory(limit: number = 50): Promise<{ history: Array<{ _id: string; amount: number; type: string; note: string | null; balanceAfter: number | null; createdAt: string }> }> {
  const resp = await api.get('/game/credits/history', { params: { limit } });
  return resp.data?.data ?? { history: [] };
}

export default api;




