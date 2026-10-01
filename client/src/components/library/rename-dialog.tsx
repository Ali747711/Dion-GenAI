import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import type { Asset } from "@/lib/api/types"
import { useUpdateAsset } from "@/hooks/use-assets"

interface RenameDialogProps {
  asset: Asset | null
  onClose: () => void
}

function RenameForm({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const update = useUpdateAsset()
  const [title, setTitle] = React.useState(asset.title)
  const [error, setError] = React.useState<string | null>(null)

  const handleSave = () => {
    const trimmed = title.trim()
    if (!trimmed) {
      setError("The title cannot be empty.")
      return
    }
    update.mutate(
      { id: asset.id, patch: { title: trimmed } },
      {
        onSuccess: () => {
          toast.success("Track renamed")
          onClose()
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : "Rename failed.")
        },
      }
    )
  }

  return (
    <>
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor="rename-title">Title</FieldLabel>
        <Input
          id="rename-title"
          value={title}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            setTitle(event.target.value)
            setError(null)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              handleSave()
            }
          }}
        />
        {error ? <FieldError>{error}</FieldError> : null}
      </Field>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? <Spinner data-icon="inline-start" /> : null}
          Save
        </Button>
      </DialogFooter>
    </>
  )
}

export function RenameDialog({ asset, onClose }: RenameDialogProps) {
  return (
    <Dialog open={asset !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename track</DialogTitle>
          <DialogDescription>
            Renames the library entry; the stored audio file is unchanged.
          </DialogDescription>
        </DialogHeader>
        {asset ? (
          <RenameForm key={asset.id} asset={asset} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
