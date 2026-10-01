import * as React from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"

import { CostPreview } from "@/components/studio/cost-preview"
import { UploadField } from "@/components/studio/upload-field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { isApiError } from "@/lib/api/client"
import type { Upload, VoiceCloneInput } from "@/lib/api/studio-types"
import { isTerminalJobStatus } from "@/lib/api/types"
import { validateVoiceCloneInput } from "@/lib/studio-validation"
import { useCreateJob, useJob } from "@/hooks/use-jobs"
import { useIdempotencyKey } from "@/hooks/use-uploads"

interface VoiceCloneDialogProps {
  trigger: React.ReactElement
}

/** Clone a voice from an uploaded sample (PRD F5): permission is mandatory. */
export function VoiceCloneDialog({ trigger }: VoiceCloneDialogProps) {
  const queryClient = useQueryClient()
  const createJob = useCreateJob()
  const [key, rotateKey] = useIdempotencyKey()
  const [open, setOpen] = React.useState(false)
  const [upload, setUpload] = React.useState<Upload | null>(null)
  const [name, setName] = React.useState("")
  const [language, setLanguage] = React.useState("")
  const [denoise, setDenoise] = React.useState(false)
  const [permission, setPermission] = React.useState(false)
  const [attempted, setAttempted] = React.useState(false)
  const [blocked, setBlocked] = React.useState(false)
  const [jobId, setJobId] = React.useState<string>()
  const job = useJob(jobId)
  const doneRef = React.useRef<string | null>(null)

  const input: VoiceCloneInput = {
    uploadId: upload?.id ?? "",
    name: name.trim(),
    permissionConfirmed: true,
  }
  const lang = language.trim()
  if (lang) input.language = lang
  if (denoise) input.denoise = true

  const localErrors = validateVoiceCloneInput({
    ...input,
    permissionConfirmed: permission,
  })
  const errors = attempted ? localErrors : {}
  const isValid = Object.keys(localErrors).length === 0

  const data = job.data
  const running =
    createJob.isPending ||
    (data !== undefined && !isTerminalJobStatus(data.status))
  const cloned = data?.result?.kind === "voice_clone"

  React.useEffect(() => {
    if (!data || doneRef.current === data.id) return
    if (!isTerminalJobStatus(data.status)) return
    doneRef.current = data.id
    if (data.result?.kind === "voice_clone") {
      toast.success("Voice cloned", {
        description: "The new voice is available in Custom voices.",
      })
      void queryClient.invalidateQueries({ queryKey: ["voices"] })
    }
  }, [data, queryClient])

  const reset = () => {
    setUpload(null)
    setName("")
    setLanguage("")
    setDenoise(false)
    setPermission(false)
    setAttempted(false)
    setJobId(undefined)
    doneRef.current = null
  }

  const handleSubmit = () => {
    setAttempted(true)
    if (!isValid || running || blocked) return
    createJob.mutate(
      { kind: "voice_clone", idempotencyKey: key, input },
      {
        onSuccess: (created) => {
          setJobId(created.id)
          rotateKey()
        },
        onError: (cause) => {
          toast.error(
            isApiError(cause) ? cause.message : "Cloning failed to start."
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Clone a voice</DialogTitle>
          <DialogDescription>
            Uses an uploaded sample of a voice you have permission to clone. The
            provider does not document the price of cloning — the charge settles
            later and stays pending until reconciled.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <UploadField
            purpose="voice_sample"
            label="Voice sample"
            upload={upload}
            error={attempted ? errors.uploadId : undefined}
            onUploadChange={setUpload}
            disabled={running}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor="clone-name">Voice name</FieldLabel>
              <Input
                id="clone-name"
                value={name}
                maxLength={80}
                aria-invalid={errors.name ? true : undefined}
                onChange={(event) => setName(event.target.value)}
              />
              {errors.name ? <FieldError>{errors.name}</FieldError> : null}
            </Field>
            <Field>
              <FieldLabel htmlFor="clone-language">
                Language (optional)
              </FieldLabel>
              <Input
                id="clone-language"
                placeholder="en"
                maxLength={10}
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              />
            </Field>
          </div>
          <Field orientation="horizontal">
            <Switch
              id="clone-denoise"
              checked={denoise}
              onCheckedChange={(checked) => setDenoise(checked === true)}
            />
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor="clone-denoise">Denoise sample</FieldLabel>
              <FieldDescription>
                Clean background noise from the sample before cloning.
              </FieldDescription>
            </div>
          </Field>
          <Field
            orientation="horizontal"
            data-invalid={errors.permissionConfirmed ? true : undefined}
          >
            <Checkbox
              id="clone-permission"
              checked={permission}
              aria-invalid={errors.permissionConfirmed ? true : undefined}
              onCheckedChange={(checked) => setPermission(checked === true)}
            />
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor="clone-permission">
                I have this person's permission to clone their voice
              </FieldLabel>
              {errors.permissionConfirmed ? (
                <FieldError>{errors.permissionConfirmed}</FieldError>
              ) : (
                <FieldDescription>
                  Required. Cloning without consent is not supported.
                </FieldDescription>
              )}
            </div>
          </Field>
          <CostPreview
            kind="voice_clone"
            input={input}
            isValid={isValid}
            description="Voice clone · price not documented by the provider"
            onBlockedChange={setBlocked}
          />
          {failed ? (
            <p className="text-xs text-destructive">
              {data?.errorMessage ?? "Cloning did not complete."}
            </p>
          ) : null}
          {cloned ? (
            <p className="text-xs">
              The voice was cloned and saved under Custom voices. You can close
              this dialog.
            </p>
          ) : null}
        </FieldGroup>
        <DialogFooter showCloseButton>
          <Button
            onClick={handleSubmit}
            disabled={running || blocked || cloned}
          >
            {running ? <Spinner data-icon="inline-start" /> : null}
            {running ? "Cloning…" : "Clone voice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
