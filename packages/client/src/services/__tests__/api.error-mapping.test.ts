/// <reference types="jest" />
import api, { toApiErrorFromAxiosError, ApiError } from "../api";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

function makeAxiosError(
  cfg: any,
  status?: number,
  data?: any,
  code?: string
): AxiosError {
  const err = new axios.AxiosError(
    "Request failed",
    code,
    cfg as any,
    undefined,
    status
      ? ({
          status,
          statusText: String(status),
          headers: {},
          config: cfg as any,
          data,
        } as AxiosResponse)
      : undefined
  );
  // For timeout/network simulation
  if (!status && code) {
    (err as any).code = code;
  }
  return err;
}

describe("api error normalization", () => {
  test("maps DTO success:false response into ApiError", async () => {
    const cfg: AxiosRequestConfig = {
      url: "/dto-failure",
      method: "get",
      // Adapter resolves a response with success:false
      adapter: async (c) => {
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config: c,
          data: { success: false, code: "INVALID_REQUEST", message: "Nope", details: { field: "x" } },
        };
      },
    };

    await expect(api.request(cfg)).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      message: "Nope",
      status: 200,
      details: { field: "x" },
    } as ApiError);
  });

  test("maps HTTP 500 with JSON payload to HTTP_500 ApiError", async () => {
    const cfg: AxiosRequestConfig = {
      url: "/http-500",
      method: "get",
      // Adapter rejects with AxiosError containing response 500
      adapter: async (c) => {
        throw makeAxiosError(c, 500, { message: "Server exploded" });
      },
    };

    await expect(api.request(cfg)).rejects.toMatchObject({
      code: "HTTP_500",
      message: "Server exploded",
      status: 500,
    } as ApiError);
  });

  test("maps HTTP 500 with text/plain to HTTP_500 ApiError", async () => {
    const cfg: AxiosRequestConfig = {
      url: "/http-500-text",
      method: "get",
      adapter: async (c) => {
        throw makeAxiosError(c, 500, "Internal Error");
      },
    };

    let err: ApiError | null = null;
    try {
      await api.request(cfg);
    } catch (e) {
      err = e as ApiError;
    }
    expect(err).not.toBeNull();
    expect(err!.code).toBe("HTTP_500");
    expect(err!.status).toBe(500);
    // message may fallback to status text if not object; just assert code+status
  });

  test("maps timeout to TIMEOUT ApiError", async () => {
    const cfg: AxiosRequestConfig = {
      url: "/timeout",
      method: "get",
      adapter: async (c) => {
        throw makeAxiosError(c, undefined, undefined, "ECONNABORTED");
      },
    };

    await expect(api.request(cfg)).rejects.toMatchObject({
      code: "TIMEOUT",
      message: "Request timed out",
    } as ApiError);
  });

  test("maps generic network failure to NETWORK_ERROR ApiError", async () => {
    const cfg: AxiosRequestConfig = {
      url: "/network",
      method: "get",
      adapter: async (_c) => {
        // Reject with a non-AxiosError-like or an AxiosError without response/code
        throw new Error("ENETDOWN");
      },
    };

    let err: ApiError | null = null;
    try {
      await api.request(cfg);
    } catch (e) {
      err = e as ApiError;
    }
    // Interceptor wraps unknown into NETWORK_ERROR
    expect(err).not.toBeNull();
    expect(err!.code).toBe("NETWORK_ERROR");
  });

  test("toApiErrorFromAxiosError helper produces expected shapes", () => {
    const cfg: AxiosRequestConfig = { url: "/x", method: "get" };

    const dtoErr = toApiErrorFromAxiosError(
      makeAxiosError(cfg, 200, { success: false, code: "INVALID_REQUEST", message: "Bad" })
    );
    expect(dtoErr).toMatchObject({ code: "INVALID_REQUEST", message: "Bad", status: 200 });

    const httpErr = toApiErrorFromAxiosError(makeAxiosError(cfg, 404, { message: "NF" }));
    expect(httpErr).toMatchObject({ code: "HTTP_404", message: "NF", status: 404 });

    const timeoutErr = toApiErrorFromAxiosError(makeAxiosError(cfg, undefined, undefined, "ECONNABORTED"));
    expect(timeoutErr).toMatchObject({ code: "TIMEOUT" });

    const netErr = toApiErrorFromAxiosError(makeAxiosError(cfg));
    expect(netErr).toMatchObject({ code: "NETWORK_ERROR" });
  });
});
