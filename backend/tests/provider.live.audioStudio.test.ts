import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorClass } from "../src/libs/enums/job.enum";
import { LiveNoizProvider } from "../src/services/provider/live.provider";
import { ProviderBusinessError, ProviderTransientError } from "../src/services/provider/provider.types";
import { safeFetch } from "../src/services/safeFetch.service";
import { validCoverInput, validEmotionInput, validSoundInput, validSpeechInput, validVoiceDesignInput } from "./helpers/fixtures";

vi.mock("../src/services/safeFetch.service", () => ({
  safeFetch: vi.fn(),
}));

function jsonResponse(status: number, body: unknown): Response {
  const bytes = Buffer.from(JSON.stringify(body));
  return {
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => body,
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as unknown as Response;
}

function audioResponse(status: number, buffer: Buffer, headers: Record<string, string> = {}): Response {
  return {
    status,
    headers: new Headers({ "content-type": "audio/wav", "x-audio-duration": "3.5", ...headers }),
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    json: async () => null,
  } as unknown as Response;
}

describe("LiveNoizProvider — R2 audio studio (never called live; mocked fetch only)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("textToSpeech: reads binary audio bytes and the X-Audio-Duration header", async () => {
    const wav = Buffer.from("RIFF0000WAVEfmt ", "ascii");
    fetchMock.mockResolvedValueOnce(audioResponse(200, wav));

    const provider = new LiveNoizProvider();
    const result = await provider.textToSpeech(validSpeechInput("voice-1"), "provider-voice-1");

    expect(result.mimeType).toBe("audio/wav");
    expect(result.durationSeconds).toBe(3.5);
    expect(result.buffer.equals(wav)).toBe(true);
  });

  it("textToSpeech: parses a JSON error envelope on non-2xx instead of trying to read audio bytes", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(402, { code: 1002, message: "Payment required" }));

    const provider = new LiveNoizProvider();
    const error = await provider.textToSpeech(validSpeechInput("voice-1"), "provider-voice-1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderBusinessError);
  });

  // Regression: live Noiz answered TTS with HTTP 200 + {"code":402,...}; it was stored as "audio" and charged.
  it("textToSpeech: treats an HTTP 200 JSON business error as insufficient funds, never as audio", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { code: 402, message: "Insufficient credits. Please add a payment method to continue" }));

    const provider = new LiveNoizProvider();
    const error = await provider.textToSpeech(validSpeechInput("voice-1"), "provider-voice-1").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderBusinessError);
    expect((error as ProviderBusinessError).errorClass).toBe(ErrorClass.INSUFFICIENT_FUNDS);
  });

  it("textToSpeech: rejects bytes that are labelled audio but are not audio", async () => {
    fetchMock.mockResolvedValueOnce(audioResponse(200, Buffer.from("<html>oops</html>")));

    const provider = new LiveNoizProvider();
    await expect(provider.textToSpeech(validSpeechInput("voice-1"), "provider-voice-1")).rejects.toBeInstanceOf(ProviderTransientError);
  });

  it("textToSound: reads binary audio bytes on the documented success path", async () => {
    const wav = Buffer.from("RIFFxxxxWAVEfmt ", "ascii");
    fetchMock.mockResolvedValueOnce(audioResponse(200, wav));

    const provider = new LiveNoizProvider();
    const result = await provider.textToSound(validSoundInput());
    expect(result.mimeType).toBe("audio/wav");
    expect(result.buffer.equals(wav)).toBe(true);
  });

  it("textToSound: follows the documented JSON file_url fallback via safeFetch (contract drift path)", async () => {
    const downloadedBytes = Buffer.from("fake-downloaded-audio-bytes");
    vi.mocked(safeFetch).mockResolvedValueOnce({ buffer: downloadedBytes, contentType: "audio/mpeg" });

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { code: 0, data: { results: [{ file_url: "https://cdn.example.com/generated.mp3" }] } })
    );

    const provider = new LiveNoizProvider();
    const result = await provider.textToSound(validSoundInput());

    expect(safeFetch).toHaveBeenCalledWith("https://cdn.example.com/generated.mp3");
    expect(result.buffer.equals(downloadedBytes)).toBe(true);
    expect(result.mimeType).toBe("audio/mpeg");
  });

  it("emotion-enhance: parses the JSON envelope (code 0 success convention)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { code: 0, data: { emotion_enhance: "[Happy#Joy:0.8]:Hello" } }));

    const provider = new LiveNoizProvider();
    const result = await provider.emotionEnhance(validEmotionInput());
    expect(result.text).toBe("[Happy#Joy:0.8]:Hello");
  });

  it("voice-design: decodes base64 preview audio", async () => {
    const base64Audio = Buffer.from("RIFF0000WAVE").toString("base64");
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { code: 0, data: { previews: [{ voice_id: "v1", audio: base64Audio }], features: { gender: "female" } } })
    );

    const provider = new LiveNoizProvider();
    const result = await provider.voiceDesign(validVoiceDesignInput());
    expect(result.previews).toHaveLength(1);
    expect(result.previews[0]?.providerVoiceId).toBe("v1");
    expect(result.features).toEqual({ gender: "female" });
  });

  it("submitCover: business error under HTTP 200 (non-zero code) maps to ProviderBusinessError", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { code: 1001, message: "Insufficient credit balance" }));

    const provider = new LiveNoizProvider();
    const error = await provider.submitCover(validCoverInput("upload-1"), Buffer.from("x"), "audio/wav").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderBusinessError);
    expect((error as ProviderBusinessError).errorClass).toBe(ErrorClass.INSUFFICIENT_FUNDS);
  });

  it("listSoundHistory: uses the code:200 success convention (not code:0)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { code: 200, data: { list: [{ gen_product_id: "g1", prompt: "rain", duration: 5, create_time: "2026-01-01T00:00:00Z" }] } })
    );

    const provider = new LiveNoizProvider();
    const history = await provider.listSoundHistory(0, 20);
    expect(history).toEqual([{ genProductId: "g1", prompt: "rain", durationSeconds: 5, createdAt: "2026-01-01T00:00:00Z" }]);
  });

  it("listSoundHistory: a non-200 code is a business error (even though other endpoints use code 0)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { code: 0, message: "unexpected code for this endpoint" }));

    const provider = new LiveNoizProvider();
    const error = await provider.listSoundHistory(0, 20).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ProviderBusinessError);
  });

  it("deleteSoundHistoryItem: resolves on code:200 success", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { code: 200, data: { gen_product_id: "g1" } }));

    const provider = new LiveNoizProvider();
    await expect(provider.deleteSoundHistoryItem("g1")).resolves.toBeUndefined();
  });

  it("throws ProviderTransientError on HTTP 5xx for a binary endpoint", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { message: "down for maintenance" }));

    const provider = new LiveNoizProvider();
    await expect(provider.textToSound(validSoundInput())).rejects.toBeInstanceOf(ProviderTransientError);
  });
});
