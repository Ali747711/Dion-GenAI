import { describe, expect, it } from "vitest";

import AppError from "../src/libs/Errors";
import { isUnsafeAddress, safeFetch } from "../src/services/safeFetch.service";

describe("safeFetch IP classification", () => {
  it("rejects loopback addresses", () => {
    expect(isUnsafeAddress("127.0.0.1")).toBe(true);
    expect(isUnsafeAddress("::1")).toBe(true);
  });

  it("rejects RFC1918 private ranges", () => {
    expect(isUnsafeAddress("10.0.0.5")).toBe(true);
    expect(isUnsafeAddress("172.16.0.5")).toBe(true);
    expect(isUnsafeAddress("172.31.255.254")).toBe(true);
    expect(isUnsafeAddress("192.168.1.1")).toBe(true);
  });

  it("rejects link-local and the cloud metadata address", () => {
    expect(isUnsafeAddress("169.254.1.1")).toBe(true);
    expect(isUnsafeAddress("169.254.169.254")).toBe(true);
    expect(isUnsafeAddress("fe80::1")).toBe(true);
  });

  it("rejects IPv4-mapped IPv6 private addresses", () => {
    expect(isUnsafeAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isUnsafeAddress("::ffff:10.0.0.1")).toBe(true);
  });

  it("rejects unique-local IPv6 (fc00::/7)", () => {
    expect(isUnsafeAddress("fd00::1")).toBe(true);
  });

  it("allows ordinary public addresses", () => {
    expect(isUnsafeAddress("8.8.8.8")).toBe(false);
    expect(isUnsafeAddress("1.1.1.1")).toBe(false);
    expect(isUnsafeAddress("2606:4700:4700::1111")).toBe(false);
  });

  it("refuses non-https URLs before any network activity", async () => {
    await expect(safeFetch("http://example.com/file.wav")).rejects.toBeInstanceOf(AppError);
  });

  it("refuses a URL whose host resolves to a private address", async () => {
    // localhost resolves to 127.0.0.1 (or ::1) — must be refused even though DNS succeeds.
    await expect(safeFetch("https://localhost/file.wav")).rejects.toBeInstanceOf(AppError);
  });
});
