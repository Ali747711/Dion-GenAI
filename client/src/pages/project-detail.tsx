import * as React from "react"
import { Link, useParams } from "react-router"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Archive02Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons"

import {
  DownloadAssetButton,
  FavoriteAssetButton,
  PlayAssetButton,
} from "@/components/library/asset-actions"
import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import type { ProjectDetail } from "@/lib/api/types"
import { formatDuration, formatRelativeTime } from "@/lib/format"
import { useProject, useUpdateProject } from "@/hooks/use-projects"

function EditProjectDialog({
  project,
  open,
  onClose,
}: {
  project: ProjectDetail
  open: boolean
  onClose: () => void
}) {
  const update = useUpdateProject()
  const [name, setName] = React.useState(project.name)
  const [description, setDescription] = React.useState(
    project.description ?? ""
  )
  const [error, setError] = React.useState<string | null>(null)

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("The name cannot be empty.")
      return
    }
    update.mutate(
      {
        id: project.id,
        patch: { name: trimmed, description: description.trim() || undefined },
      },
      {
        onSuccess: () => {
          toast.success("Project updated")
          onClose()
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : "Update failed.")
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Rename or describe this project.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="edit-project-name">Name</FieldLabel>
            <Input
              id="edit-project-name"
              value={name}
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-project-description">
              Description
            </FieldLabel>
            <Textarea
              id="edit-project-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? <Spinner data-icon="inline-start" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Project detail: metadata plus its grouped tracks. */
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const project = useProject(id)
  const update = useUpdateProject()
  const [editing, setEditing] = React.useState(false)

  if (project.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (project.isError || !project.data) {
    return (
      <QueryError
        title="Project not found"
        error={project.error ?? new Error("This project does not exist.")}
        onRetry={() => void project.refetch()}
      />
    )
  }

  const data = project.data

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={data.name}
        description={data.description ?? undefined}
        actions={
          <>
            {data.archived ? <Badge variant="secondary">Archived</Badge> : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <HugeiconsIcon icon={PencilEdit01Icon} data-icon="inline-start" />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={update.isPending}
              onClick={() =>
                update.mutate(
                  { id: data.id, patch: { archived: !data.archived } },
                  {
                    onSuccess: () =>
                      toast.success(
                        data.archived ? "Project restored" : "Project archived"
                      ),
                  }
                )
              }
            >
              <HugeiconsIcon icon={Archive02Icon} data-icon="inline-start" />
              {data.archived ? "Unarchive" : "Archive"}
            </Button>
          </>
        }
      />

      {data.assets.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>No tracks in this project</EmptyTitle>
            <EmptyDescription>
              Assign tracks from the library, or pick this project in the
              composer before generating.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-1">
          {data.assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/50"
            >
              <PlayAssetButton asset={asset} queue={data.assets} />
              <Link
                to={`/tracks/${asset.id}`}
                className="min-w-0 flex-1 truncate text-xs font-medium hover:underline"
              >
                {asset.title}
              </Link>
              <span className="font-mono text-[0.7rem] text-muted-foreground tabular-nums">
                {formatDuration(asset.durationSeconds)}
              </span>
              <span className="hidden text-[0.7rem] text-muted-foreground sm:block">
                {formatRelativeTime(asset.createdAt)}
              </span>
              <FavoriteAssetButton asset={asset} />
              <DownloadAssetButton asset={asset} />
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <EditProjectDialog
          project={data}
          open
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  )
}
