import { lookup } from "node:dns/promises";
import https from "node:https";
import { isIP } from "node:net";

import AppError, { ErrorCode, Message } from "../libs/Errors";
import { logger } from "../libs/utils/logger";

const MAX_REDIRECTS = 5;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 100 * 1024 * 1024; // 100MB, matches the largest upload limit

export interface SafeFetchResult {
  buffer: Buffer;
  contentType: string | null;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
}

/**
 * Downloads a remote URL while defending against SSRF: https only, DNS
 * resolved and validated (rejecting loopback/private/link-local/metadata
 * addresses) BEFORE connecting, connects directly to the validated IP
 * (immune to DNS-rebinding between check and connect), re-validates every
 * redirect hop, and enforces a redirect limit plus size/time bounds.
 */
export async function safeFetch(url: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  let currentUrl = url;
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    const outcome = await fetchOnce(currentUrl, timeoutMs, maxBytes);
    if (outcome.kind === "redirect") {
      if (redirectCount === MAX_REDIRECTS) {
        throw new AppError(ErrorCode.PROVIDER_UNAVAILABLE, Message.PROVIDER_UNAVAILABLE, { retryable: false });
      }
      currentUrl = outcome.location;
      continue;
    }
    return { buffer: outcome.buffer, contentType: outcome.contentType };
  }
  throw new AppError(ErrorCode.PROVIDER_UNAVAILABLE, Message.PROVIDER_UNAVAILABLE, { retryable: false });
}

type FetchOnceResult = { kind: "redirect"; location: string } | { kind: "body"; buffer: Buffer; contentType: string | null };

async function fetchOnce(rawUrl: string, timeoutMs: number, maxBytes: number): Promise<FetchOnceResult> {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:") {
    throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { url: "Only https URLs are allowed" } });
  }

  const address = await resolvePublicAddress(parsed.hostname);

  return new Promise<FetchOnceResult>((resolve, reject) => {
    const request = https.request(
      {
        host: address,
        port: parsed.port ? Number.parseInt(parsed.port, 10) : 443,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: { Host: parsed.hostname, "User-Agent": "music-studio-backend/1.0" },
        servername: parsed.hostname, // correct TLS SNI + cert validation against the real hostname
        timeout: timeoutMs,
      },
      (response) => {
        const status = response.statusCode ?? 0;

        if (status >= 300 && status < 400) {
          const location = response.headers.location;
          response.resume();
          if (!location) {
            reject(new AppError(ErrorCode.PROVIDER_UNAVAILABLE, Message.PROVIDER_UNAVAILABLE));
            return;
          }
          try {
            const resolved = new URL(location, parsed).toString();
            resolve({ kind: "redirect", location: resolved });
          } catch {
            reject(new AppError(ErrorCode.PROVIDER_UNAVAILABLE, Message.PROVIDER_UNAVAILABLE));
          }
          return;
        }

        if (status < 200 || status >= 300) {
          response.resume();
          reject(new AppError(ErrorCode.PROVIDER_UNAVAILABLE, Message.PROVIDER_UNAVAILABLE, { retryable: false }));
          return;
        }

        const chunks: Buffer[] = [];
        let received = 0;
        response.on("data", (chunk: Buffer) => {
          received += chunk.length;
          if (received > maxBytes) {
            response.destroy();
            reject(new AppError(ErrorCode.PAYLOAD_TOO_LARGE, Message.PAYLOAD_TOO_LARGE));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({ kind: "body", buffer: Buffer.concat(chunks), contentType: response.headers["content-type"] ?? null });
        });
        response.on("error", (error) => reject(error));
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("safeFetch request timed out"));
    });
    request.on("error", (error) => {
      logger.warn({ err: error, host: parsed.hostname }, "safeFetch request failed");
      reject(new AppError(ErrorCode.PROVIDER_UNAVAILABLE, Message.PROVIDER_UNAVAILABLE));
    });
    request.end();
  });
}

/** Resolves a hostname and rejects it if it (or any resolved address) is loopback/private/link-local/metadata. */
async function resolvePublicAddress(hostname: string): Promise<string> {
  const candidates = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (candidates.length === 0) {
    throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { url: "Host does not resolve" } });
  }
  for (const candidate of candidates) {
    if (isUnsafeAddress(candidate.address)) {
      throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { url: "Host resolves to a disallowed address" } });
    }
  }
  const first = candidates[0];
  if (!first) throw new AppError(ErrorCode.VALIDATION_FAILED, Message.VALIDATION_FAILED, { fields: { url: "Host does not resolve" } });
  return first.address;
}

/** Exported for unit tests: whether a resolved IP is loopback/private/link-local/metadata and must be refused. */
export function isUnsafeAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isUnsafeIPv4(address);
  if (version === 6) return isUnsafeIPv6(address);
  return true; // couldn't parse -> refuse
}

function isUnsafeIPv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts as [number, number, number, number];

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 192 && b === 0) return true; // 192.0.0.0/24 (IETF protocol assignments)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isUnsafeIPv6(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized === "::1") return true; // loopback
  if (normalized === "::") return true;
  if (normalized.startsWith("fe80:") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true; // link-local fe80::/10
  }
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local fc00::/7
  if (normalized.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 — validate the embedded IPv4 address too.
    const mapped = normalized.slice("::ffff:".length);
    return isUnsafeIPv4(mapped);
  }
  return false;
}
