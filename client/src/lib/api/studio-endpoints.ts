/** R2 Audio Studio endpoints (uploads, voices, transcript export). */

import { api, ensureCsrfToken } from "@/lib/api/client"
import type {
  Upload,
  UploadPurpose,
  Voice,
  VoiceType,
} from "@/lib/api/studio-types"
import type { ApiErrorBody, ListResponse } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"

// Uploads
export const getUpload = (id: string): Promise<Upload> =>
  api.request(`/uploads/${id}`)

export interface UploadProgressEvent {
  loaded: number
  total: number
}

/**
 * Multipart upload via XHR so real progress events are available.
 * Resolves with the server-validated Upload (detected type, size, duration)
 * or rejects with an {@link ApiError} built from the contract envelope.
 */
export function uploadFile(options: {
  file: File
  purpose: UploadPurpose
  onProgress?: (event: UploadProgressEvent) => void
  signal?: AbortSignal
}): Promise<Upload> {
  const { file, purpose, onProgress, signal } = options
  return new Promise<Upload>((resolve, reject) => {
    void ensureCsrfToken().then((token) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", "/api/v1/uploads")
      if (token) xhr.setRequestHeader("X-CSRF-Token", token)
      xhr.responseType = "text"

      const abort = () => xhr.abort()
      if (signal) {
        if (signal.aborted) {
          reject(new DOMException("Upload cancelled", "AbortError"))
          return
        }
        signal.addEventListener("abort", abort, { once: true })
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress?.({ loaded: event.loaded, total: event.total })
        }
      }
      xhr.onerror = () => {
        signal?.removeEventListener("abort", abort)
        reject(new Error("The upload failed. Check the connection and retry."))
      }
      xhr.onabort = () => {
        signal?.removeEventListener("abort", abort)
        reject(new DOMException("Upload cancelled", "AbortError"))
      }
      xhr.onload = () => {
        signal?.removeEventListener("abort", abort)
        const status = xhr.status
        const parsed = parseJson(xhr.responseText)
        if (status >= 200 && status < 300 && parsed && "data" in parsed) {
          resolve((parsed as { data: Upload }).data)
          return
        }
        reject(new ApiError(status, extractErrorBody(parsed, status)))
      }

      const form = new FormData()
      form.append("file", file)
      form.append("purpose", purpose)
      xhr.send(form)
    })
  })
}

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw)
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function extractErrorBody(
  parsed: Record<string, unknown> | null,
  status: number
): ApiErrorBody {
  const fallback: ApiErrorBody = {
    code: status === 413 ? "PAYLOAD_TOO_LARGE" : "INTERNAL",
    message:
      status === 413
        ? "The file is larger than the server accepts for this purpose."
        : `Upload failed with status ${status}.`,
    requestId: "unknown",
    retryable: status >= 500,
  }
  if (parsed && typeof parsed.error === "object" && parsed.error !== null) {
    return { ...fallback, ...(parsed.error as Partial<ApiErrorBody>) }
  }
  return fallback
}

// Voices
export interface VoiceListParams {
  type?: VoiceType
  q?: string
}

export const listVoices = (
  params: VoiceListParams = {}
): Promise<ListResponse<Voice>> => {
  const search = new URLSearchParams()
  if (params.type) search.set("type", params.type)
  if (params.q) search.set("q", params.q)
  const qs = search.toString()
  return api.requestList<Voice>(`/voices${qs ? `?${qs}` : ""}`)
}

export const getVoice = (id: string): Promise<Voice> =>
  api.request(`/voices/${id}`)

export const renameVoice = (id: string, name: string): Promise<Voice> =>
  api.request(`/voices/${id}`, { method: "PATCH", body: { name } })

export const deleteVoice = (id: string): Promise<Voice> =>
  api.request(`/voices/${id}`, { method: "DELETE", body: { confirm: true } })

// Transcription export (plain links; the browser downloads the attachment).
export type TranscriptFormat = "txt" | "srt" | "json"

export const transcriptExportUrl = (
  jobId: string,
  format: TranscriptFormat
): string => `/api/v1/jobs/${jobId}/transcript?format=${format}`
