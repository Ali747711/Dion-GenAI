import * as React from "react"

import { isApiError } from "@/lib/api/client"
import { uploadFile } from "@/lib/api/studio-endpoints"
import type { Upload, UploadPurpose } from "@/lib/api/studio-types"
import { precheckFile } from "@/lib/upload-rules"

export interface FileUploadState {
  isUploading: boolean
  /** 0–100, only while uploading. */
  progress: number
  error: string | null
  /** Field-level server message (e.g. rejected type/duration), when present. */
  fieldError: string | null
  start: (file: File) => Promise<Upload | null>
  cancel: () => void
  clearError: () => void
}

/**
 * XHR upload with progress for one purpose. Runs the client-side precheck
 * first, then surfaces the contract error envelope on failure.
 */
export function useFileUpload(purpose: UploadPurpose): FileUploadState {
  const [isUploading, setIsUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => () => abortRef.current?.abort(), [])

  const clearError = React.useCallback(() => {
    setError(null)
    setFieldError(null)
  }, [])

  const cancel = React.useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const start = React.useCallback(
    async (file: File): Promise<Upload | null> => {
      const precheck = precheckFile(purpose, file)
      setFieldError(null)
      if (precheck) {
        setError(precheck)
        return null
      }
      const controller = new AbortController()
      abortRef.current = controller
      setError(null)
      setProgress(0)
      setIsUploading(true)
      try {
        const upload = await uploadFile({
          file,
          purpose,
          signal: controller.signal,
          onProgress: ({ loaded, total }) =>
            setProgress(Math.min(100, Math.round((loaded / total) * 100))),
        })
        return upload
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return null
        }
        if (isApiError(cause)) {
          setError(cause.message)
          setFieldError(cause.fields.file ?? null)
        } else {
          setError(
            cause instanceof Error ? cause.message : "The upload failed."
          )
        }
        return null
      } finally {
        setIsUploading(false)
        setProgress(0)
        abortRef.current = null
      }
    },
    [purpose]
  )

  return { isUploading, progress, error, fieldError, start, cancel, clearError }
}

/** Stable idempotency key that rotates after each accepted submission. */
export function useIdempotencyKey(): [string, () => void] {
  const [key, setKey] = React.useState(() => crypto.randomUUID())
  const rotate = React.useCallback(() => setKey(crypto.randomUUID()), [])
  return [key, rotate]
}
