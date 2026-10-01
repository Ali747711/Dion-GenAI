import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Copy01Icon, Download01Icon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  transcriptExportUrl,
  type TranscriptFormat,
} from "@/lib/api/studio-endpoints"
import type { TranscriptSegment } from "@/lib/api/studio-types"
import { formatDuration } from "@/lib/format"

const EXPORT_FORMATS: TranscriptFormat[] = ["txt", "srt", "json"]

interface TranscriptViewProps {
  jobId: string
  language: string
  transcript: string
  durationSeconds: number
  segments: TranscriptSegment[]
}

/** Transcription result: detected language, copy, segments, exports. */
export function TranscriptView({
  jobId,
  language,
  transcript,
  durationSeconds,
  segments,
}: TranscriptViewProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard
      .writeText(transcript)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => toast.error("Copy failed — select the text manually."))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Language: {language}</Badge>
        <Badge variant="outline">{formatDuration(durationSeconds)}</Badge>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          aria-live="polite"
        >
          <HugeiconsIcon icon={Copy01Icon} data-icon="inline-start" />
          {copied ? "Copied" : "Copy transcript"}
        </Button>
        {EXPORT_FORMATS.map((format) => (
          <Button
            key={format}
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={
              <a href={transcriptExportUrl(jobId, format)} download>
                <HugeiconsIcon icon={Download01Icon} data-icon="inline-start" />
                {format.toUpperCase()}
              </a>
            }
          />
        ))}
      </div>

      <ScrollArea className="max-h-48 rounded-lg border p-3">
        <p className="text-xs leading-relaxed whitespace-pre-wrap">
          {transcript || "The transcript is empty."}
        </p>
      </ScrollArea>

      {segments.length > 0 ? (
        <>
          <Separator />
          <p className="text-xs font-medium">Segments</p>
          <ul className="flex flex-col gap-1.5" aria-label="Transcript segments">
            {segments.map((segment, index) => (
              <li
                key={`${segment.start}-${index}`}
                className="flex items-start gap-2 text-xs"
              >
                <span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                  {formatDuration(segment.start)}–{formatDuration(segment.end)}
                </span>
                {segment.speaker !== null ? (
                  <Badge variant="secondary" className="shrink-0">
                    Speaker {segment.speaker + 1}
                  </Badge>
                ) : null}
                <span className="min-w-0">{segment.text}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
