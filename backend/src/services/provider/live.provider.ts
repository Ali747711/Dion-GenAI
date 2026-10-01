import { env } from "../../config/env";
import { SPEECH_STREAM_CHAR_THRESHOLD } from "../../libs/configs";
import { ErrorClass } from "../../libs/enums/job.enum";
import type {
  CoverInput,
  EmotionInput,
  SoundInput,
  SpeechInput,
  TranscriptionInput,
  VoiceCloneInput,
  VoiceDesignInput,
} from "../../libs/types/audioStudio";
import type { MusicInput } from "../../libs/types/music";
import { MIME_EXTENSIONS, sniffAudioMime } from "../../libs/utils/audioSniff";
import { logger } from "../../libs/utils/logger";
import { safeFetch } from "../safeFetch.service";
import type {
  AudioBinaryResult,
  AudioStudioProviderAdapter,
  CoverPollResult,
  CoverSubmitResult,
  CoverVariantResult,
  EmotionEnhanceResult,
  ProviderVoiceSummary,
  RecognizeLyricsResult,
  SoundHistoryItem,
  TranscribeResult,
  VoiceCloneResult,
  VoiceDesignResult,
} from "./audioStudio.types";
import type { MusicProviderAdapter, PollContext, ProviderPollResult, ProviderSubmitResult, ProviderVariantHandle } from "./provider.types";
import { ProviderBusinessError, ProviderTimeoutError, ProviderTransientError } from "./provider.types";

const SUBMIT_TIMEOUT_MS = 30_000;
const POLL_TIMEOUT_MS = 15_000;

type HttpMethod = "GET" | "POST" | "DELETE";

/**
 * Live Noiz adapter, built strictly from the documented contract (never
 * verified against the real API — no live calls are made outside of unit
 * tests with a mocked `fetch`). See backend/CONTRACT_NOTES.md for the
 * assumptions this parsing logic makes about the exact response shape.
 */
export class LiveNoizProvider implements MusicProviderAdapter, AudioStudioProviderAdapter {
  public readonly mode = "live" as const;

  public async submit(input: MusicInput): Promise<ProviderSubmitResult> {
    const form = new FormData();
    form.set("prompt", input.prompt);
    if (input.lyricsMode === "lyrics" && input.lyrics) form.set("lyrics", input.lyrics);
    if (input.lyricsMode === "generate" && input.lyricsPrompt) form.set("lyrics_prompt", input.lyricsPrompt);
    if (input.title) form.set("title", input.title);
    if (input.tags && input.tags.length > 0) form.set("tags", JSON.stringify(input.tags));
    if (input.negativeTags && input.negativeTags.length > 0) form.set("negative_tags", JSON.stringify(input.negativeTags));
    if (input.vocalGender) form.set("vocal_gender", input.vocalGender);

    const response = await this.request("POST", "/text-to-music", SUBMIT_TIMEOUT_MS, form);
    const json = assertBusinessSuccess(response.body, response.status);
    return { variants: extractVariants(json) };
  }

  public async poll(providerProductId: string, _context: PollContext): Promise<ProviderPollResult> {
    const response = await this.request("GET", `/text-to-music/${encodeURIComponent(providerProductId)}`, POLL_TIMEOUT_MS);
    const json = assertBusinessSuccess(response.body, response.status);
    return mapPollResponse(json);
  }

  // --- R2: Audio Studio ---

  public async submitCover(input: CoverInput, sourceBuffer: Buffer, sourceMimeType: string): Promise<CoverSubmitResult> {
    const form = new FormData();
    form.set("source_audio_file", bufferToBlob(sourceBuffer, sourceMimeType), fileNameFor("source", sourceMimeType));
    form.set("lyrics", input.lyrics);
    form.set("melody_adherence", input.melodyAdherence);
    if (input.musicDescription) form.set("music_description", input.musicDescription);
    if (input.style) form.set("style", input.style);
    if (input.title) form.set("title", input.title);
    if (input.vocalGender) form.set("vocal_gender", input.vocalGender === "male" ? "Male" : "Female");

    const response = await this.request("POST", "/text-to-music/cover", SUBMIT_TIMEOUT_MS, form);
    const json = assertBusinessSuccess(response.body, response.status) as { task_id?: string };
    if (!json.task_id) throw new ProviderTransientError("Unexpected provider response: cover submit missing task_id");
    return { taskId: json.task_id };
  }

  public async pollCover(taskId: string, _context: { submittedAt: Date }): Promise<CoverPollResult> {
    const response = await this.request("GET", `/text-to-music/cover/${encodeURIComponent(taskId)}`, POLL_TIMEOUT_MS);
    const json = assertBusinessSuccess(response.body, response.status) as {
      status?: string;
      stage?: string;
      results?: Array<{ gen_product_id?: string; status?: string; duration?: number; audio_url?: string; error_message?: string }>;
    };

    const results = json.results ?? [];
    const variants: CoverVariantResult[] = results.slice(0, 2).map((item, index) => {
      const rawStatus = item.status ?? "unknown";
      const status = mapRawStatus(rawStatus);
      return {
        index: index as 0 | 1,
        providerProductId: item.gen_product_id ?? null,
        status,
        rawStatus,
        durationSeconds: typeof item.duration === "number" ? item.duration : null,
        resultLocation: status === "succeeded" ? (item.audio_url ?? null) : null,
        errorMessage: item.error_message ?? null,
      };
    });

    return {
      status: mapRawStatus(json.status ?? "unknown"),
      rawStatus: json.status ?? "unknown",
      stage: json.stage ?? null,
      variants,
    };
  }

  public async recognizeLyrics(sourceBuffer: Buffer, sourceMimeType: string, idempotencyKey: string): Promise<RecognizeLyricsResult> {
    const form = new FormData();
    form.set("source_audio_file", bufferToBlob(sourceBuffer, sourceMimeType), fileNameFor("source", sourceMimeType));
    form.set("idempotency_key", idempotencyKey);

    const response = await this.request("POST", "/text-to-music/cover/recognize-lyrics", SUBMIT_TIMEOUT_MS, form);
    const json = assertBusinessSuccess(response.body, response.status) as { has_vocals?: boolean; lyrics?: string; charged?: boolean; credit_charged?: boolean };
    return {
      hasVocals: Boolean(json.has_vocals),
      lyrics: json.lyrics ?? "",
      charged: Boolean(json.charged ?? json.credit_charged),
    };
  }

  public async textToSound(input: SoundInput): Promise<AudioBinaryResult> {
    const form = new FormData();
    form.set("prompt", input.prompt);
    form.set("duration", String(input.durationSeconds));
    form.set("output_format", input.format);

    const response = await this.rawRequest("POST", "/text-to-sound", SUBMIT_TIMEOUT_MS, form);
    return this.readAudioOrJsonFallback(response);
  }

  public async textToSpeech(input: SpeechInput, voiceProviderId: string): Promise<AudioBinaryResult> {
    const stream = input.text.length > SPEECH_STREAM_CHAR_THRESHOLD;
    const form = new FormData();
    form.set("text", input.text);
    form.set("voice_id", voiceProviderId);
    form.set("output_format", stream ? "wav" : input.format);
    if (input.speed !== undefined) form.set("speed", String(input.speed));
    if (input.targetLang) form.set("target_lang", input.targetLang);
    if (input.trimSilence !== undefined) form.set("trim_silence", String(input.trimSilence));
    form.set("stream", String(stream));

    const response = await this.rawRequest("POST", "/text-to-speech", stream ? 120_000 : SUBMIT_TIMEOUT_MS, form);
    const audio = await readAudioBody(response);
    if (!audio) throw unexpectedNonAudio();
    return audio;
  }

  public async emotionEnhance(input: EmotionInput): Promise<EmotionEnhanceResult> {
    const response = await this.request("POST", "/emotion-enhance", SUBMIT_TIMEOUT_MS, JSON.stringify({ text: input.text }), {
      "Content-Type": "application/json",
    });
    const json = assertBusinessSuccess(response.body, response.status) as { emotion_enhance?: string };
    return { text: json.emotion_enhance ?? input.text };
  }

  public async voiceDesign(input: VoiceDesignInput): Promise<VoiceDesignResult> {
    const form = new FormData();
    form.set("voice_description", input.voiceDescription);
    if (input.guidanceScale !== undefined) form.set("guidance_scale", String(input.guidanceScale));
    if (input.loudness !== undefined) form.set("loudness", String(input.loudness));

    const response = await this.request("POST", "/voice-design", SUBMIT_TIMEOUT_MS, form);
    const json = assertBusinessSuccess(response.body, response.status) as {
      previews?: Array<{ voice_id?: string; audio?: string }>;
      features?: Record<string, string>;
    };
    const previews = (json.previews ?? []).map((preview) => {
      if (!preview.voice_id || !preview.audio) {
        throw new ProviderTransientError("Unexpected provider response: voice-design preview missing voice_id/audio");
      }
      return { providerVoiceId: preview.voice_id, audioBuffer: Buffer.from(preview.audio, "base64") };
    });
    if (previews.length === 0) throw new ProviderTransientError("Unexpected provider response: voice-design returned no previews");
    return { previews, features: json.features ?? null };
  }

  public async cloneVoice(input: VoiceCloneInput, sourceBuffer: Buffer, sourceMimeType: string): Promise<VoiceCloneResult> {
    const form = new FormData();
    form.set("file", bufferToBlob(sourceBuffer, sourceMimeType), fileNameFor("sample", sourceMimeType));
    form.set("display_name", input.name);
    if (input.denoise !== undefined) form.set("denoise", String(input.denoise));
    if (input.language) form.set("language", input.language);

    const response = await this.request("POST", "/voices", SUBMIT_TIMEOUT_MS, form);
    const json = assertBusinessSuccess(response.body, response.status) as { voice_id?: string };
    if (!json.voice_id) throw new ProviderTransientError("Unexpected provider response: voice clone missing voice_id");
    return { providerVoiceId: json.voice_id, previewBuffer: null };
  }

  public async transcribe(input: TranscriptionInput, sourceBuffer: Buffer, sourceMimeType: string, _uploadDurationSeconds: number): Promise<TranscribeResult> {
    const form = new FormData();
    form.set("file", bufferToBlob(sourceBuffer, sourceMimeType), fileNameFor("audio", sourceMimeType));
    if (input.language) form.set("language", input.language);

    const response = await this.request("POST", "/speech-to-text", SUBMIT_TIMEOUT_MS, form);
    const json = assertBusinessSuccess(response.body, response.status) as {
      language?: string;
      transcript?: string;
      duration?: number;
      segments?: Array<{ text?: string; start?: number; end?: number; spk?: number }>;
    };
    const segments = (json.segments ?? []).map((segment) => ({
      text: segment.text ?? "",
      start: typeof segment.start === "number" ? segment.start : 0,
      end: typeof segment.end === "number" ? segment.end : 0,
      speaker: typeof segment.spk === "number" ? segment.spk : null,
    }));
    return {
      language: json.language ?? input.language ?? "und",
      transcript: json.transcript ?? "",
      durationSeconds: typeof json.duration === "number" ? json.duration : 0,
      segments,
    };
  }

  public async listBuiltInVoices(): Promise<ProviderVoiceSummary[]> {
    const response = await this.request("GET", "/voices?voice_type=built-in&limit=100", POLL_TIMEOUT_MS);
    const json = assertBusinessSuccess(response.body, response.status) as {
      voices?: Array<{ voice_id?: string; display_name?: string; labels?: string }>;
    };
    return (json.voices ?? [])
      .filter((voice): voice is { voice_id: string; display_name?: string; labels?: string } => Boolean(voice.voice_id))
      .map((voice) => ({ providerVoiceId: voice.voice_id, name: voice.display_name ?? voice.voice_id, labels: voice.labels ?? null, language: null }));
  }

  public async deleteVoice(providerVoiceId: string): Promise<{ deleted: boolean }> {
    const response = await this.request("DELETE", `/voices/${encodeURIComponent(providerVoiceId)}`, POLL_TIMEOUT_MS);
    assertBusinessSuccess(response.body, response.status);
    return { deleted: true };
  }

  public async listSoundHistory(skip: number, limit: number): Promise<SoundHistoryItem[]> {
    const response = await this.request("GET", `/text-to-sound-history?skip=${skip}&limit=${limit}`, POLL_TIMEOUT_MS);
    const json = assertSoundHistorySuccess(response.body, response.status) as {
      list?: Array<{ gen_product_id?: string; prompt?: string; duration?: number; create_time?: string }>;
    };
    return (json.list ?? [])
      .filter((item): item is { gen_product_id: string; prompt?: string; duration?: number; create_time?: string } => Boolean(item.gen_product_id))
      .map((item) => ({
        genProductId: item.gen_product_id,
        prompt: item.prompt ?? "",
        durationSeconds: typeof item.duration === "number" ? item.duration : 0,
        createdAt: item.create_time ?? new Date().toISOString(),
      }));
  }

  public async deleteSoundHistoryItem(genProductId: string): Promise<void> {
    const response = await this.request("DELETE", `/text-to-sound-history/${encodeURIComponent(genProductId)}`, POLL_TIMEOUT_MS);
    assertSoundHistorySuccess(response.body, response.status);
  }

  // --- internals ---

  private async readAudioOrJsonFallback(response: Response): Promise<AudioBinaryResult> {
    const audio = await readAudioBody(response, { allowJson: true });
    if (audio) return audio;

    // Defensive JSON fallback for /text-to-sound (documented drift risk — NOIZ_R2_CONTRACTS.md §7.1).
    const json = parsedJsonBodies.get(response) as { data?: { results?: Array<{ file_url?: string; error?: string }> } } | null;
    const fileUrl = json?.data?.results?.[0]?.file_url;
    if (!fileUrl) {
      throw new ProviderTransientError("Unexpected provider response: neither audio bytes nor a file_url were returned");
    }
    logger.warn({ fileUrl }, "provider_contract_drift: /text-to-sound returned JSON with file_url instead of binary audio");
    const downloaded = await safeFetch(fileUrl);
    return {
      buffer: downloaded.buffer,
      mimeType: downloaded.contentType?.split(";")[0]?.trim() || "audio/mpeg",
      durationSeconds: 0,
    };
  }

  private async rawRequest(method: HttpMethod, path: string, timeoutMs: number, body?: FormData): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${env.NOIZ_BASE_URL}${path}`, {
        method,
        headers: { Authorization: env.NOIZ_API_KEY ?? "" },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) throw new ProviderTimeoutError();
      throw new ProviderTransientError(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timeout);
    }
  }

  private async request(
    method: HttpMethod,
    path: string,
    timeoutMs: number,
    body?: FormData | string,
    extraHeaders?: Record<string, string>
  ): Promise<{ status: number; body: unknown }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${env.NOIZ_BASE_URL}${path}`, {
        method,
        headers: { Authorization: env.NOIZ_API_KEY ?? "", ...extraHeaders },
        body,
        signal: controller.signal,
      });
      const parsed: unknown = await response.json().catch(() => null);
      return { status: response.status, body: parsed };
    } catch (error) {
      if (isAbortError(error)) {
        // A timeout on the SUBMIT path is ambiguous: the request may have
        // reached Noiz. Callers must treat this as submission_unknown, never
        // blindly retry.
        throw new ProviderTimeoutError();
      }
      throw new ProviderTransientError(error instanceof Error ? error.message : String(error));
    } finally {
      clearTimeout(timeout);
    }
  }
}

function bufferToBlob(buffer: Buffer, mimeType: string): Blob {
  return new Blob([new Uint8Array(buffer)], { type: mimeType });
}

function fileNameFor(baseName: string, mimeType: string): string {
  return `${baseName}.${MIME_EXTENSIONS[mimeType] ?? "bin"}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

interface BusinessEnvelope {
  code?: number;
  message?: string;
  data?: unknown;
}

/** JSON bodies already consumed by readAudioBody, so the sound fallback can inspect them. */
const parsedJsonBodies = new WeakMap<Response, unknown>();

function unexpectedNonAudio(): ProviderTransientError {
  return new ProviderTransientError("Unexpected provider response: no audio bytes were returned");
}

/**
 * Binary endpoints answer errors as JSON — sometimes under HTTP 200 (e.g.
 * {"code":402,"message":"Insufficient credits…"}). Never store such a body as audio:
 * JSON is checked for a business error, and audio bytes must sniff as real audio.
 * Returns null for a successful JSON body (only when allowJson, for the sound fallback).
 */
async function readAudioBody(response: Response, options: { allowJson?: boolean } = {}): Promise<AudioBinaryResult | null> {
  const contentType = (response.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  const buffer = Buffer.from(await response.arrayBuffer());
  const looksJson = contentType.includes("json") || buffer.subarray(0, 1).toString() === "{";

  if (response.status >= 400 || looksJson) {
    let body: unknown = null;
    try {
      body = JSON.parse(buffer.toString("utf8"));
    } catch {
      body = null;
    }
    assertBusinessSuccess(body, response.status);
    if (!options.allowJson) throw unexpectedNonAudio();
    parsedJsonBodies.set(response, body);
    return null;
  }

  const sniffed = sniffAudioMime(buffer);
  if (!sniffed) throw unexpectedNonAudio();
  const durationHeader = response.headers.get("x-audio-duration");
  return {
    buffer,
    mimeType: sniffed,
    durationSeconds: durationHeader ? Number.parseFloat(durationHeader) : 0,
  };
}

/** Validates the "business code non-zero with HTTP 200 -> error" rule (also covers non-2xx HTTP). */
function assertBusinessSuccess(body: unknown, httpStatus: number): unknown {
  const envelope = (body ?? {}) as BusinessEnvelope;

  if (httpStatus >= 500) {
    throw new ProviderTransientError(`Provider returned HTTP ${httpStatus}`);
  }
  if (httpStatus === 429) {
    throw new ProviderBusinessError("Rate limited by provider", ErrorClass.RATE_LIMITED);
  }
  if (httpStatus >= 400) {
    throw new ProviderBusinessError(envelope.message ?? `Provider returned HTTP ${httpStatus}`, mapMessageToErrorClass(envelope.message));
  }

  const businessCode = envelope.code;
  if (typeof businessCode === "number" && businessCode !== 0) {
    logger.warn({ businessCode, message: envelope.message }, "Noiz business error under HTTP 200");
    throw new ProviderBusinessError(envelope.message ?? "Provider reported a business error", mapMessageToErrorClass(envelope.message));
  }

  return envelope.data ?? envelope;
}

/** Same as `assertBusinessSuccess` but for the sound-history endpoints, whose success code is 200 (not 0). */
function assertSoundHistorySuccess(body: unknown, httpStatus: number): unknown {
  const envelope = (body ?? {}) as BusinessEnvelope;

  if (httpStatus >= 500) throw new ProviderTransientError(`Provider returned HTTP ${httpStatus}`);
  if (httpStatus === 429) throw new ProviderBusinessError("Rate limited by provider", ErrorClass.RATE_LIMITED);
  if (httpStatus >= 400) throw new ProviderBusinessError(envelope.message ?? `Provider returned HTTP ${httpStatus}`, mapMessageToErrorClass(envelope.message));

  const businessCode = envelope.code;
  if (typeof businessCode === "number" && businessCode !== 200) {
    throw new ProviderBusinessError(envelope.message ?? "Provider reported a business error", mapMessageToErrorClass(envelope.message));
  }

  return envelope.data ?? envelope;
}

function mapMessageToErrorClass(message: string | undefined): ErrorClass {
  const text = (message ?? "").toLowerCase();
  if (text.includes("credit") || text.includes("balance") || text.includes("fund")) return ErrorClass.INSUFFICIENT_FUNDS;
  if (text.includes("auth") || text.includes("key") || text.includes("unauthor")) return ErrorClass.INVALID_CREDENTIALS;
  if (text.includes("rate")) return ErrorClass.RATE_LIMITED;
  if (text.includes("invalid") || text.includes("valid")) return ErrorClass.INVALID_INPUT;
  return ErrorClass.GENERATION_FAILED;
}

function extractVariants(data: unknown): ProviderVariantHandle[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { variants?: unknown[] } | null)?.variants)
      ? (data as { variants: unknown[] }).variants
      : null;

  if (!list || list.length === 0) {
    throw new ProviderTransientError("Unexpected provider response: no variants in submit response");
  }

  return list.slice(0, 2).map((item, index) => {
    const record = item as { gen_product_id?: string; id?: string };
    const providerProductId = record.gen_product_id ?? record.id;
    if (!providerProductId) {
      throw new ProviderTransientError("Unexpected provider response: variant missing gen_product_id");
    }
    return { index: index as 0 | 1, providerProductId };
  });
}

function mapPollResponse(data: unknown): ProviderPollResult {
  const record = (data ?? {}) as {
    status?: string;
    state?: string;
    duration?: number;
    duration_seconds?: number;
    progress?: number;
    audio_url?: string;
    result_url?: string;
    url?: string;
    error_message?: string;
  };

  const rawStatus = record.status ?? record.state ?? "unknown";
  const status = mapRawStatus(rawStatus);
  const resultLocation = record.audio_url ?? record.result_url ?? record.url ?? null;
  const durationSeconds = record.duration_seconds ?? record.duration ?? null;

  return {
    status,
    rawStatus,
    durationSeconds: typeof durationSeconds === "number" ? durationSeconds : null,
    progress: typeof record.progress === "number" ? record.progress : null,
    resultLocation: status === "succeeded" ? resultLocation : null,
    errorMessage: record.error_message ?? null,
  };
}

function mapRawStatus(rawStatus: string): ProviderPollResult["status"] {
  const normalized = rawStatus.toLowerCase();
  if (["succeeded", "success", "done", "completed", "finished"].includes(normalized)) return "succeeded";
  if (["failed", "error", "cancelled", "canceled"].includes(normalized)) return "failed";
  if (["running", "processing", "pending", "queued", "submitted"].includes(normalized)) return "running";
  return "unknown";
}
