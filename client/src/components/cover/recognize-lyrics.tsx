import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { AiMicIcon } from "@hugeicons/core-free-icons"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { isApiError } from "@/lib/api/client"
import { isTerminalJobStatus } from "@/lib/api/types"
import { useCreateJob, useJob } from "@/hooks/use-jobs"
import { useIdempotencyKey } from "@/hooks/use-uploads"

interface RecognizeLyricsProps {
  uploadId: string | null
  disabled?: boolean
  /** Fills the editable lyrics; never submits the cover itself. */
  onRecognized: (lyrics: string, hasVocals: boolean) => void
}

/**
 * Separate paid "Recognize lyrics" action (PRD F2): its own cost notice,
 * explicit confirmation, and a distinct no-vocals state. The recognized text
 * only fills the editor — the cover is never auto-submitted.
 */
export function RecognizeLyrics({
  uploadId,
  disabled,
  onRecognized,
}: RecognizeLyricsProps) {
  const createJob = useCreateJob()
  const [key, rotateKey] = useIdempotencyKey()
  const [jobId, setJobId] = React.useState<string>()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const job = useJob(jobId)
  const appliedRef = React.useRef<string | null>(null)

  const data = job.data
  const result =
    data?.result?.kind === "lyrics_recognition" ? data.result : null
  // Derived, not stored: the note tracks the latest recognition result.
  const noVocals = result !== null && !result.hasVocals
  const running =
    createJob.isPending ||
    (data !== undefined && !isTerminalJobStatus(data.status))

  React.useEffect(() => {
    if (!data || !result || appliedRef.current === data.id) return
    appliedRef.current = data.id
    onRecognized(result.lyrics, result.hasVocals)
    if (result.hasVocals) {
      toast.success("Lyrics recognized", {
        description:
          "The editor was filled — review and edit before submitting.",
      })
    }
  }, [data, result, onRecognized])

  const handleConfirm = () => {
    if (!uploadId) return
    setConfirmOpen(false)
    createJob.mutate(
      { kind: "lyrics_recognition", idempotencyKey: key, input: { uploadId } },
      {
        onSuccess: (created) => {
          setJobId(created.id)
          rotateKey()
        },
        onError: (cause) => {
          toast.error(
            isApiError(cause) ? cause.message : "Recognition failed to start."
          )
        },
      }
    )
  }

  const failed =
    data !== undefined &&
    isTerminalJobStatus(data.status) &&
    data.status !== "succeeded"

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || !uploadId || running}
              >
                {running ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <HugeiconsIcon icon={AiMicIcon} data-icon="inline-start" />
                )}
                Recognize lyrics
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Recognize lyrics from the source?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This is a separate paid operation: 100 credits, charged only if
                vocals are detected in the upload. The recognized text fills the
                lyrics editor for you to review — the cover is not submitted
                automatically.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not now</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}>
                Recognize (100 credits if vocals)
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {running ? (
          <span className="text-[0.7rem] text-muted-foreground">
            Listening to the source…
          </span>
        ) : null}
      </div>
      {noVocals ? (
        <p className="text-[0.7rem] text-muted-foreground">
          No vocals were detected in the source, so nothing was charged. You can
          still write lyrics yourself for the cover.
        </p>
      ) : null}
      {failed ? (
        <p className="text-[0.7rem] text-destructive">
          {data?.errorMessage ??
            "Recognition did not complete. You can retry it or write lyrics yourself."}
        </p>
      ) : null}
    </div>
  )
}
