import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { MagicWand01Icon } from "@hugeicons/core-free-icons"

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
import { STUDIO_LIMITS } from "@/lib/studio-validation"
import { useCreateJob, useJob } from "@/hooks/use-jobs"
import { useIdempotencyKey } from "@/hooks/use-uploads"

interface EnhanceEmotionProps {
  text: string
  disabled?: boolean
  /** Replaces the speech text with the annotated result. */
  onEnhanced: (text: string) => void
}

/**
 * Separate "Enhance emotion" job (PRD F5): explicit confirmation with a
 * price-not-documented notice; on success the annotated text replaces the
 * editor content.
 */
export function EnhanceEmotion({ text, disabled, onEnhanced }: EnhanceEmotionProps) {
  const createJob = useCreateJob()
  const [key, rotateKey] = useIdempotencyKey()
  const [jobId, setJobId] = React.useState<string>()
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const job = useJob(jobId)
  const appliedRef = React.useRef<string | null>(null)

  const trimmed = text.trim()
  const tooLong = trimmed.length > STUDIO_LIMITS.speechMp3Text
  const data = job.data
  const running =
    createJob.isPending ||
    (data !== undefined && !isTerminalJobStatus(data.status))

  React.useEffect(() => {
    if (!data || appliedRef.current === data.id) return
    if (data.result?.kind !== "emotion_enhance") return
    appliedRef.current = data.id
    onEnhanced(data.result.text)
    toast.success("Emotion annotations applied", {
      description: "The text was replaced with the annotated version — review it before generating speech.",
    })
  }, [data, onEnhanced])

  const failed =
    data !== undefined &&
    isTerminalJobStatus(data.status) &&
    data.status !== "succeeded"

  const handleConfirm = () => {
    if (!trimmed || tooLong) return
    setConfirmOpen(false)
    createJob.mutate(
      {
        kind: "emotion_enhance",
        idempotencyKey: key,
        input: { text: trimmed },
      },
      {
        onSuccess: (created) => {
          setJobId(created.id)
          rotateKey()
        },
        onError: (cause) => {
          toast.error(
            isApiError(cause) ? cause.message : "Enhancement failed to start."
          )
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || !trimmed || tooLong || running}
              >
                {running ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <HugeiconsIcon
                    icon={MagicWand01Icon}
                    data-icon="inline-start"
                  />
                )}
                Enhance emotion
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Add emotion annotations?</AlertDialogTitle>
              <AlertDialogDescription>
                This runs a separate paid job that rewrites your text with
                emotion tags (for example [Happy#Joy:0.6]). The provider does
                not document its price, so nothing is reserved up front and the
                settled charge stays pending until reconciled. Your current text
                will be replaced with the annotated version.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep my text</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}>
                Enhance and replace text
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {tooLong ? (
          <span className="text-[0.7rem] text-muted-foreground">
            Available for text up to{" "}
            {STUDIO_LIMITS.speechMp3Text.toLocaleString("en-US")} characters.
          </span>
        ) : null}
      </div>
      {failed ? (
        <p className="text-[0.7rem] text-destructive">
          {data?.errorMessage ??
            "Emotion enhancement did not complete. Your text was left unchanged."}
        </p>
      ) : null}
    </div>
  )
}
