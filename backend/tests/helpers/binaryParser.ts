import type { Response } from "superagent";

/** Buffers a raw (non-JSON/text) response body so tests can assert on exact bytes. */
export function binaryParser(res: Response, callback: (err: Error | null, body: Buffer) => void): void {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => callback(null, Buffer.concat(chunks)));
}
