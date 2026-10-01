import * as React from "react"
import { Link } from "react-router"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon, Folder01Icon } from "@hugeicons/core-free-icons"

import { ListSkeleton } from "@/components/shared/list-skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { formatRelativeTime } from "@/lib/format"
import { useCreateProject, useProjects } from "@/hooks/use-projects"

function CreateProjectDialog() {
  const create = useCreateProject()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const handleCreate = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError("Give the project a name.")
      return
    }
    create.mutate(
      { name: trimmed, description: description.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Project created")
          setOpen(false)
          setName("")
          setDescription("")
          setError(null)
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : "Creation failed.")
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
            New project
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Projects group tracks and future assets without copying files.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="project-name">Name</FieldLabel>
            <Input
              id="project-name"
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
            <FieldLabel htmlFor="project-description">
              Description (optional)
            </FieldLabel>
            <Textarea
              id="project-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={create.isPending}>
            {create.isPending ? <Spinner data-icon="inline-start" /> : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Project list with creation dialog. */
export function ProjectsPage() {
  const projects = useProjects()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Projects"
        description="Group related tracks and assets."
        actions={<CreateProjectDialog />}
      />

      {projects.isLoading ? (
        <ListSkeleton rows={4} rowClassName="h-20" />
      ) : projects.isError ? (
        <QueryError
          title="Could not load projects"
          error={projects.error}
          onRetry={() => void projects.refetch()}
        />
      ) : projects.data && projects.data.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.data.map((project) => (
            <Card key={project.id} size="sm" className="transition-colors hover:ring-foreground/20">
              <CardHeader>
                <CardTitle className="text-xs">
                  <Link
                    to={`/projects/${project.id}`}
                    className="hover:underline"
                  >
                    {project.name}
                  </Link>
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {project.description ?? "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Badge variant="secondary">
                  {project.assetCount}{" "}
                  {project.assetCount === 1 ? "track" : "tracks"}
                </Badge>
                <span className="text-[0.7rem] text-muted-foreground">
                  Updated {formatRelativeTime(project.updatedAt)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create a project to keep an album, campaign, or experiment
              together.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
