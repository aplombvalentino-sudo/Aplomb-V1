import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  verifyTurnstileToken,
  isTurnstileConfigured,
  TURNSTILE_PROTECT_LOGIN,
} from "./turnstile";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Helper to extract the URLSearchParams sent to siteverify.
function bodyFromFetchCall(call: unknown[]): URLSearchParams {
  const init = call[1] as { body: URLSearchParams };
  return init.body;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("TURNSTILE_PROTECT_LOGIN flag", () => {
  it("is OFF — the post-signup auto-login carries no token, so login must not gate on Turnstile", () => {
    expect(TURNSTILE_PROTECT_LOGIN).toBe(false);
  });
});

describe("isTurnstileConfigured", () => {
  it("returns true iff TURNSTILE_SECRET_KEY is set", () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(isTurnstileConfigured()).toBe(false);
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    expect(isTurnstileConfigured()).toBe(true);
  });
});

describe("verifyTurnstileToken — no secret configured", () => {
  it("FAIL-OPEN: returns success/skipped and does NOT call Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const r = await verifyTurnstileToken("any-token", "1.2.3.4");
    expect(r).toEqual({ success: true, skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("verifyTurnstileToken — secret set", () => {
  beforeEach(() => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");
  });

  it("rejects an empty/missing token without contacting Cloudflare", async () => {
    expect(await verifyTurnstileToken(undefined)).toEqual({
      success: false,
      errorCodes: ["missing-input-response"],
    });
    expect(await verifyTurnstileToken("")).toEqual({
      success: false,
      errorCodes: ["missing-input-response"],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts secret + response + remoteip to siteverify on success", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ success: true }) });
    const r = await verifyTurnstileToken("user-token", "1.2.3.4");
    expect(r).toEqual({ success: true });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(SITEVERIFY_URL);
    expect((init as { method: string }).method).toBe("POST");
    const body = bodyFromFetchCall(fetchMock.mock.calls[0]);
    expect(body.get("secret")).toBe("secret-key");
    expect(body.get("response")).toBe("user-token");
    expect(body.get("remoteip")).toBe("1.2.3.4");
  });

  it("omits remoteip when it is missing or the literal 'unknown'", async () => {
    fetchMock.mockResolvedValue({ json: async () => ({ success: true }) });

    await verifyTurnstileToken("t", undefined);
    expect(bodyFromFetchCall(fetchMock.mock.calls[0]).has("remoteip")).toBe(false);

    fetchMock.mockClear();
    fetchMock.mockResolvedValue({ json: async () => ({ success: true }) });

    await verifyTurnstileToken("t", "unknown");
    expect(bodyFromFetchCall(fetchMock.mock.calls[0]).has("remoteip")).toBe(false);
  });

  it("returns the Cloudflare error-codes verbatim on a rejection", async () => {
    fetchMock.mockResolvedValue({
      json: async () => ({ success: false, "error-codes": ["invalid-input-response"] }),
    });
    expect(await verifyTurnstileToken("bad-token")).toEqual({
      success: false,
      errorCodes: ["invalid-input-response"],
    });
  });

  it("returns errorCodes:['internal-error'] when the fetch to Cloudflare throws", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    expect(await verifyTurnstileToken("any-token")).toEqual({
      success: false,
      errorCodes: ["internal-error"],
    });
  });
});
