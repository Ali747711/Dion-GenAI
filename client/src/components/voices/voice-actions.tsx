import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons"

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { Voice } from "@/lib/api/studio-types"
import { useDeleteVoice, useRenameVoice } from "@/hooks/use-voices"

function RenameVoiceDialog({ voice }: { voice: Voice }) {
  const rename = useRenameVoice()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState(voice.name)
  const [error, setError] = React.useState<string | null>(null)

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("The name cannot be empty.")
      return
    }
    rename.mutate(
      { id: voice.id, name: trimmed },
      {
        onSuccess: () => {
          toast.success("Voice renamed")
          setOpen(false)
        },
        onError: (cause) =>
          setError(cause instanceof Error ? cause.message : "Rename failed."),
      }
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setName(voice.name)
          setError(null)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Rename ${voice.name}`}
          >
            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename voice</DialogTitle>
          <DialogDescription>
            Changes the local display name of this voice.
          </DialogDescription>
        </DialogHeader>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={`voice-rename-${voice.id}`}>Name</FieldLabel>
          <Input
            id={`voice-rename-${voice.id}`}
            value={name}
            maxLength={80}
            aria-invalid={error ? true : undefined}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <DialogFooter showCloseButton>
          <Button onClick={handleSave} disabled={rename.isPending}>
            {rename.isPending ? <Spinner data-icon="inline-start" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteVoiceDialog({ voice }: { voice: Voice }) {
  const remove = useDeleteVoice()
  const [open, setOpen] = React.useState(false)

  const handleConfirm = () => {
    setOpen(false)
    remove.mutate(voice.id, {
      onSuccess: (deleted) => {
        toast.success(
          deleted.deletionStatus === "deleted"
            ? "Voice deleted"
            : `Deletion requested (status: ${deleted.deletionStatus})`
        )
      },
      onError: (cause) =>
        toast.error(cause instanceof Error ? cause.message : "Delete failed."),
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${voice.name}`}
            disabled={remove.isPending || voice.deletionStatus === "deleting"}
          >
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{voice.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This requests deletion at the provider (soft delete) and removes the
            voice from your library. Speech already generated with it is not
            affected. This cannot be undone here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep voice</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            Delete voice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Rename/delete for custom and designed voices; built-ins are read-only. */
export function VoiceActions({ voice }: { voice: Voice }) {
  if (voice.type === "built-in") return null
  return (
    <div className="flex items-center gap-0.5">
      <RenameVoiceDialog voice={voice} />
      <DeleteVoiceDialog voice={voice} />
    </div>
  )
}
