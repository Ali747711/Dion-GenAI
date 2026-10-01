import * as React from "react"
import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { FavouriteIcon, Search01Icon } from "@hugeicons/core-free-icons"

import {
  DownloadAssetButton,
  FavoriteAssetButton,
  PlayAssetButton,
} from "@/components/library/asset-actions"
import { AssetRowMenu } from "@/components/library/asset-row-menu"
import { AssignProjectDialog } from "@/components/library/assign-project-dialog"
import { LibraryEmptyState } from "@/components/library/library-empty-state"
import { RenameDialog } from "@/components/library/rename-dialog"
import { ListSkeleton } from "@/components/shared/list-skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Toggle } from "@/components/ui/toggle"
import type { AssetSource } from "@/lib/api/studio-types"
import type { Asset } from "@/lib/api/types"
import type { AssetListParams } from "@/lib/api/endpoints"
import { formatDuration, formatRelativeTime } from "@/lib/format"
import { ASSET_SOURCE_LABELS } from "@/lib/studio-meta"
import { useAssetList } from "@/hooks/use-assets"
import { useProjects } from "@/hooks/use-projects"

const SORT_ITEMS = [
  { label: "Newest first", value: "createdAt:desc" },
  { label: "Oldest first", value: "createdAt:asc" },
  { label: "Title A–Z", value: "title:asc" },
  { label: "Title Z–A", value: "title:desc" },
  { label: "Longest first", value: "duration:desc" },
  { label: "Shortest first", value: "duration:asc" },
]

const VARIANT_LABELS = ["A", "B"] as const

const SOURCE_ITEMS: { label: string; value: string }[] = [
  { label: "All sources", value: "all" },
  ...(Object.entries(ASSET_SOURCE_LABELS) as [AssetSource, string][]).map(
    ([value, label]) => ({ label, value })
  ),
]

function sourceBadge(asset: Asset) {
  if (!asset.source || asset.source === "music") return null
  return <Badge variant="secondary">{ASSET_SOURCE_LABELS[asset.source]}</Badge>
}

function variantBadge(asset: Asset) {
  if (asset.variantIndex === null) return null
  return (
    <Badge variant="outline">Var {VARIANT_LABELS[asset.variantIndex]}</Badge>
  )
}

/** Library: dense table on desktop, list cards on mobile (PRD F3). */
export function LibraryPage() {
  const [searchText, setSearchText] = React.useState("")
  const [q, setQ] = React.useState("")
  const [favoriteOnly, setFavoriteOnly] = React.useState(false)
  const [projectId, setProjectId] = React.useState("all")
  const [source, setSource] = React.useState("all")
  const [sortValue, setSortValue] = React.useState("createdAt:desc")
  const [showArchived, setShowArchived] = React.useState(false)
  const [renameTarget, setRenameTarget] = React.useState<Asset | null>(null)
  const [assignTarget, setAssignTarget] = React.useState<Asset | null>(null)

  React.useEffect(() => {
    const handle = window.setTimeout(() => setQ(searchText.trim()), 400)
    return () => window.clearTimeout(handle)
  }, [searchText])

  const [sort, order] = sortValue.split(":") as [
    AssetListParams["sort"],
    AssetListParams["order"],
  ]
  const params: AssetListParams = {
    q: q || undefined,
    favorite: favoriteOnly || undefined,
    projectId: projectId !== "all" ? projectId : undefined,
    source:
      source !== "all" && source in ASSET_SOURCE_LABELS
        ? (source as AssetSource)
        : undefined,
    archived: showArchived,
    sort,
    order,
    limit: 25,
  }

  const list = useAssetList(params)
  const { data: projects } = useProjects()
  const assets = list.data?.pages.flatMap((page) => page.data) ?? []

  const projectItems = [
    { label: "All projects", value: "all" },
    ...(projects?.map((p) => ({ label: p.name, value: p.id })) ?? []),
  ]
  const archiveItems = [
    { label: "Active", value: "active" },
    { label: "Archived", value: "archived" },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Library"
        description="Every generated track, searchable and organized."
      />

      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search tracks…"
            aria-label="Search tracks"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </InputGroup>
        <Toggle
          variant="outline"
          pressed={favoriteOnly}
          onPressedChange={setFavoriteOnly}
          aria-label="Show favorites only"
        >
          <HugeiconsIcon icon={FavouriteIcon} strokeWidth={2} />
          Favorites
        </Toggle>
        <Select
          items={projectItems}
          value={projectId}
          onValueChange={(value: unknown) => {
            if (typeof value === "string") setProjectId(value)
          }}
        >
          <SelectTrigger aria-label="Filter by project">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {projectItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          items={SOURCE_ITEMS}
          value={source}
          onValueChange={(value: unknown) => {
            if (typeof value === "string") setSource(value)
          }}
        >
          <SelectTrigger aria-label="Filter by source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {SOURCE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          items={SORT_ITEMS}
          value={sortValue}
          onValueChange={(value: unknown) => {
            if (typeof value === "string") setSortValue(value)
          }}
        >
          <SelectTrigger aria-label="Sort order">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {SORT_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          items={archiveItems}
          value={showArchived ? "archived" : "active"}
          onValueChange={(value: unknown) =>
            setShowArchived(value === "archived")
          }
        >
          <SelectTrigger aria-label="Archive filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {archiveItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {list.isLoading ? (
        <ListSkeleton rows={8} />
      ) : list.isError ? (
        <QueryError
          title="Could not load the library"
          error={list.error}
          onRetry={() => void list.refetch()}
        />
      ) : assets.length === 0 ? (
        <LibraryEmptyState
          favoriteOnly={favoriteOnly}
          filtered={
            Boolean(q) ||
            projectId !== "all" ||
            source !== "all" ||
            showArchived
          }
        />
      ) : (
        <>
          {/* Desktop: dense table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <PlayAssetButton asset={asset} queue={assets} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/tracks/${asset.id}`}
                          className="max-w-64 truncate font-medium hover:underline"
                        >
                          {asset.title}
                        </Link>
                        {variantBadge(asset)}
                        {sourceBadge(asset)}
                        {asset.archived ? (
                          <Badge variant="secondary">Archived</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {asset.projectName ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatDuration(asset.durationSeconds)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeTime(asset.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-0.5">
                        <FavoriteAssetButton asset={asset} />
                        <DownloadAssetButton asset={asset} />
                        <AssetRowMenu
                          asset={asset}
                          onRename={setRenameTarget}
                          onAssignProject={setAssignTarget}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: list cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {assets.map((asset) => (
              <Card key={asset.id} size="sm">
                <CardContent className="flex items-center gap-2">
                  <PlayAssetButton asset={asset} queue={assets} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      to={`/tracks/${asset.id}`}
                      className="truncate text-xs font-medium hover:underline"
                    >
                      {asset.title}
                    </Link>
                    <span className="truncate text-[0.7rem] text-muted-foreground">
                      {asset.variantIndex !== null
                        ? `Variant ${VARIANT_LABELS[asset.variantIndex]} · `
                        : ""}
                      {asset.source && asset.source !== "music"
                        ? `${ASSET_SOURCE_LABELS[asset.source]} · `
                        : ""}
                      {formatDuration(asset.durationSeconds)}
                      {asset.projectName ? ` · ${asset.projectName}` : ""}
                    </span>
                  </div>
                  <FavoriteAssetButton asset={asset} />
                  <AssetRowMenu
                    asset={asset}
                    onRename={setRenameTarget}
                    onAssignProject={setAssignTarget}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {list.hasNextPage ? (
            <Button
              variant="outline"
              className="self-center"
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {list.isFetchingNextPage ? (
                <Spinner data-icon="inline-start" />
              ) : null}
              Load more
            </Button>
          ) : null}
        </>
      )}

      <RenameDialog
        asset={renameTarget}
        onClose={() => setRenameTarget(null)}
      />
      <AssignProjectDialog
        asset={assignTarget}
        onClose={() => setAssignTarget(null)}
      />
    </div>
  )
}
