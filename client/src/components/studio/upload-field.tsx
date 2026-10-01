import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Cancel01Icon,
  CloudUploadIcon,
  FileAudioIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import type { Upload, UploadPurpose } from "@/lib/api/studio-types"
import { formatBytes, formatDuration } from "@/lib/format"
import { acceptAttribute, UPLOAD_RULES } from "@/lib/upload-rules"
import { useFileUpload } from "@/hooks/use-uploads"
import { cn } from "cn"

interface UploadFieldProps {
  purpose: UploadPurpose
  label: string
  upload: Upload | null
  onUploadChange: (upload: Upload | null) => void
  /** External validation error (e.g. "upload required" after submit). */
  error?: string
  disabled?: boolean
}

/**
 * Drag/drop + picker upload with client-side precheck per purpose, XHR
 * progress, and the server-detected type/size/duration once stored.
 */
export function UploadField({
  purpose,
  label,
  upload,
  onUploadChange,
  error,
  disabled,
}: UploadFieldProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = React.useState(false)
  const state = useFileUpload(purpose)
  const rule = UPLOAD_RULES[purpose]
  const inputId = `upload-${purpose}`
  const shownError = state.fieldError ?? state.error ?? error

  const handleFile = (file: File | undefined) => {
    if (!file || disabled || state.isUploading) return
    void state.start(file).then((stored) => {
      if (stored) onUploadChange(stored)
    })
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    handleFile(event.dataTransfer.files[0])
  }

  return (
    <Field data-invalid={shownError ? true : undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      {/* Wrapped so Field's `*:w-full` never resizes the sr-only input. */}
      <div className="flex flex-col">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={acceptAttribute(purpose)}
          className="sr-only"
          disabled={disabled || state.isUploading}
          aria-invalid={shownError ? true : undefined}
          onChange={(event) => {
            handleFile(event.target.files?.[0])
            event.target.value = ""
          }}
        />
        {upload ? (
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <HugeiconsIcon
              icon={FileAudioIcon}
              strokeWidth={2}
              className="size-5 shrink-0 text-muted-foreground"
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium">
                {upload.filename}
              </span>
              <span className="text-[0.7rem] text-muted-foreground">
                {upload.mimeType} · {formatBytes(upload.bytes)}
                {upload.durationSeconds !== null
                  ? ` · ${formatDuration(upload.durationSeconds)}`
                  : ""}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${upload.filename}`}
              disabled={disabled}
              onClick={() => {
                state.clearError()
                onUploadChange(null)
              }}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label={`${label}: choose a file or drop it here`}
            className={cn(
              "flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
              dragActive && "border-ring bg-accent",
              disabled || state.isUploading
                ? "opacity-60"
                : "cursor-pointer hover:bg-accent/50",
              "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            )}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragOver={(event) => {
              event.preventDefault()
              if (!disabled && !state.isUploading) setDragActive(true)
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
          >
            <HugeiconsIcon
              icon={CloudUploadIcon}
              strokeWidth={2}
              className="size-6 text-muted-foreground"
            />
            {state.isUploading ? (
              <div className="flex w-full max-w-56 flex-col items-center gap-2">
                <Progress
                  value={state.progress}
                  aria-label="Upload progress"
                  className="w-full"
                />
                <span className="text-[0.7rem] text-muted-foreground">
                  Uploading… {state.progress}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation()
                    state.cancel()
                  }}
                >
                  Cancel upload
                </Button>
              </div>
            ) : (
              <>
                <span className="text-xs font-medium">
                  Drop a file here or click to browse
                </span>
                <span className="text-[0.7rem] text-muted-foreground">
                  {rule.hint}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      {shownError ? (
        <FieldError>{shownError}</FieldError>
      ) : (
        <FieldDescription>
          The server verifies the real type and duration after upload; uploads
          expire in 24 hours unless a job uses them.
        </FieldDescription>
      )}
    </Field>
  )
}
