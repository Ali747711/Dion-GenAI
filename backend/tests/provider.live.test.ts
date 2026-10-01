import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorClass } from "../src/libs/enums/job.enum";
import { LiveNoizProvider } from "../src/services/provider/live.provider";
import { ProviderBusinessError, ProviderTimeoutError, ProviderTransientError } from "../src/services/provider/provider.types";
import { validMusicInput } from "./helpers/fixtures";

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    json: async () => body,
  } as unknown as Response;
}

describe("LiveNoizProvider (built strictly from the documented contract; never called live)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses a successful submit response into two variant handles", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { code: 0, message: "ok", data: { variants: [{ gen_product_id: "abc" }, { gen_product_id: "def" }] } })
    );

    const provider = new LiveNoizProvider();
    const result = await provider.submit(validMusicInput());

    expect(result.variants).toEqual([
      { index: 0, providerProductId: "abc" },
      { index: 1, providerProductId: "def" },
    ]);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://noiz.ai/v1/text-to-music");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBeDefined();
    // No "Bearer " prefix per the documented contract.
    expect((init.headers as Record<string, string>).Authorization.startsWith("Bearer ")).toBe(false);
  });

  it("throws ProviderBusinessError when the business code is non-zero despite HTTP 200", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { code: 1001, message: "Insufficient credit balance" }));

    const provider = new LiveNoizProvider();
    const error = await provider.submit(validMusicInput()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderBusinessError);
    expect((error as InstanceType<typeof ProviderBusinessError>).errorClass).toBe(ErrorClass.INSUFFICIENT_FUNDS);
  });

  it("throws ProviderBusinessError mapped to invalid_credentials on HTTP 401", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: "Invalid API key" }));

    const provider = new LiveNoizProvider();
    const error = await provider.submit(validMusicInput()).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProviderBusinessError);
    expect((error as InstanceType<typeof ProviderBusinessError>).errorClass).toBe(ErrorClass.INVALID_CREDENTIALS);
  });

  it("throws ProviderTransientError on HTTP 5xx", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { message: "down for maintenance" }));

    const provider = new LiveNoizProvider();
    await expect(provider.submit(validMusicInput())).rejects.toBeInstanceOf(ProviderTransientError);
  });

  it("throws ProviderTimeoutError (submission_unknown territory) when the request aborts", async () => {
    fetchMock.mockImplementationOnce(() => {
      const err = new Error("aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });

    const provider = new LiveNoizProvider();
    await expect(provider.submit(validMusicInput())).rejects.toBeInstanceOf(ProviderTimeoutError);
  });

  it("maps a succeeded poll response and only exposes a result location when succeeded", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { code: 0, data: { status: "succeeded", duration_seconds: 42, audio_url: "https://cdn.example/x.mp3" } })
    );

    const provider = new LiveNoizProvider();
    const result = await provider.poll("abc", { submittedAt: new Date(), index: 0 });

    expect(result.status).toBe("succeeded");
    expect(result.durationSeconds).toBe(42);
    expect(result.resultLocation).toBe("https://cdn.example/x.mp3");
  });

  it("never exposes a result location for a non-succeeded poll response", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { code: 0, data: { status: "running", progress: 40 } }));

    const provider = new LiveNoizProvider();
    const result = await provider.poll("abc", { submittedAt: new Date(), index: 0 });

    expect(result.status).toBe("running");
    expect(result.resultLocation).toBeNull();
  });
});
