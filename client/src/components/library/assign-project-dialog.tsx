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
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { Asset } from "@/lib/api/types"
import { useUpdateAsset } from "@/hooks/use-assets"
import { useProjects } from "@/hooks/use-projects"

interface AssignProjectDialogProps {
  asset: Asset | null
  onClose: () => void
}

function AssignForm({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const { data: projects, isLoading } = useProjects()
  const update = useUpdateAsset()
  const [projectId, setProjectId] = React.useState<string>(
    asset.projectId ?? "none"
  )

  const items = [
    { label: "No project", value: "none" },
    ...(projects?.map((project) => ({
      label: project.name,
      value: project.id,
    })) ?? []),
  ]

  const handleSave = () => {
    update.mutate(
      {
        id: asset.id,
        patch: { projectId: projectId === "none" ? null : projectId },
      },
      {
        onSuccess: () => {
          toast.success("Project updated")
          onClose()
        },
        onError: (cause) => {
          toast.error(
            cause instanceof Error ? cause.message : "Assignment failed."
          )
        },
      }
    )
  }

  return (
    <>
      <Field>
        <FieldLabel htmlFor="assign-project">Project</FieldLabel>
        <Select
          items={items}
          value={projectId}
          onValueChange={(value: unknown) => {
            if (typeof value === "string") setProjectId(value)
          }}
        >
          <SelectTrigger id="assign-project" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={update.isPending || isLoading}>
          {update.isPending ? <Spinner data-icon="inline-start" /> : null}
          Save
        </Button>
      </DialogFooter>
    </>
  )
}

export function AssignProjectDialog({ asset, onClose }: AssignProjectDialogProps) {
  return (
    <Dialog open={asset !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign to project</DialogTitle>
          <DialogDescription>
            Projects group tracks without copying the audio files.
          </DialogDescription>
        </DialogHeader>
        {asset ? (
          <AssignForm key={asset.id} asset={asset} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
