/// <reference types="jest" />
import api, { refreshAccessToken } from "../api";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

// Helper: build an AxiosError with 401 status
function make401(cfg: any): any {
  const err = new axios.AxiosError(
    "Unauthorized",
    undefined,
    cfg as any,
    undefined,
    {
      status: 401,
      statusText: "Unauthorized",
      headers: {},
      config: cfg as any,
      data: { success: false, code: "UNAUTHORIZED", message: "Unauthorized" },
    } as AxiosResponse
  );
  return err;
}

describe("single-flight 401 refresh and replay", () => {
  test("N concurrent 401s trigger exactly one refresh; all requests replay once and succeed", async () => {
    // Spy on refreshAccessToken to ensure called once and returns a new token
    const spy = jest.spyOn(require("../api"), "refreshAccessToken").mockImplementation(async () => {
      // small delay to ensure both requests are awaiting
      await new Promise((r) => setTimeout(r, 20));
      return "NEW_TOKEN";
    });

    // Adapter that fails with 401 on first attempt per-request,
    // and succeeds on replay (_retry401 === true)
    const adapter = async (c: any) => {
      if (c && c._retry401) {
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config: c,
          data: { success: true, data: { ok: true } },
        } as AxiosResponse;
      }
      throw make401(c);
    };

    const cfgA: AxiosRequestConfig = { url: "/sf/a", method: "get", adapter };
    const cfgB: AxiosRequestConfig = { url: "/sf/b", method: "get", adapter };

    // Fire two concurrent requests that will both hit 401 initially
    const p1 = api.request(cfgA);
    const p2 = api.request(cfgB);

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1.data).toEqual({ success: true, data: { ok: true } });
    expect(r2.data).toEqual({ success: true, data: { ok: true } });
    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });

  test("if refresh fails, requests reject with UNAUTHORIZED and token is not replayed", async () => {
    // refresh returns null -> failure
    const spy = jest.spyOn(require("../api"), "refreshAccessToken").mockResolvedValue(null);

    const adapter = async (c: any) => {
      if (c && c._retry401) {
        // Should not get here because refresh fails
        return {
          status: 200,
          statusText: "OK",
          headers: {},
          config: c,
          data: { success: true, data: { ok: true } },
        } as AxiosResponse;
      }
      throw make401(c);
    };

    const cfg: AxiosRequestConfig = { url: "/sf/fail", method: "get", adapter };

    let err: any = null;
    try {
      await api.request(cfg);
    } catch (e) {
      err = e;
    }

    expect(err).toBeTruthy();
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.status).toBe(401);

    spy.mockRestore();
  });
});
