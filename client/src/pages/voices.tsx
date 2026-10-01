import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Copy01Icon,
  Mic01Icon,
  PaintBrush01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import { ListSkeleton } from "@/components/shared/list-skeleton"
import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { CapabilityNotice } from "@/components/studio/capability-notice"
import { VoicePreviewButton } from "@/components/speech/voice-picker"
import { VoiceActions } from "@/components/voices/voice-actions"
import { VoiceCloneDialog } from "@/components/voices/voice-clone-dialog"
import { VoiceDesignDialog } from "@/components/voices/voice-design-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Voice, VoiceType } from "@/lib/api/studio-types"
import { useVoices } from "@/hooks/use-voices"

const TYPE_TABS: { label: string; value: VoiceType }[] = [
  { label: "Built-in", value: "built-in" },
  { label: "Custom", value: "custom" },
  { label: "Designed", value: "designed" },
]

function DeletionBadge({ voice }: { voice: Voice }) {
  if (voice.deletionStatus === "active") return null
  const label =
    voice.deletionStatus === "deleting"
      ? "Deleting"
      : voice.deletionStatus === "deleted"
        ? "Deleted"
        : "Delete failed"
  return (
    <Badge
      variant={voice.deletionStatus === "delete_failed" ? "destructive" : "secondary"}
    >
      {label}
    </Badge>
  )
}

/** Voice library (PRD F5): built-in/custom/designed, clone and design. */
export function VoicesPage() {
  const [type, setType] = React.useState<VoiceType>("built-in")
  const [searchText, setSearchText] = React.useState("")
  const [q, setQ] = React.useState("")

  React.useEffect(() => {
    const handle = window.setTimeout(() => setQ(searchText.trim()), 400)
    return () => window.clearTimeout(handle)
  }, [searchText])

  const voices = useVoices({ type, q: q || undefined })
  const list = voices.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Voices"
        description="Built-in, cloned, and designed voices for the speech studio."
        actions={
          <>
            <VoiceCloneDialog
              trigger={
                <Button variant="outline" size="sm">
                  <HugeiconsIcon icon={Copy01Icon} data-icon="inline-start" />
                  Clone voice
                </Button>
              }
            />
            <VoiceDesignDialog
              trigger={
                <Button size="sm">
                  <HugeiconsIcon
                    icon={PaintBrush01Icon}
                    data-icon="inline-start"
                  />
                  Design voice
                </Button>
              }
            />
          </>
        }
      />
      <CapabilityNotice capabilityKey="voices" />

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          value={type}
          onValueChange={(value) => {
            if (value === "built-in" || value === "custom" || value === "designed") {
              setType(value)
            }
          }}
        >
          <TabsList>
            {TYPE_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <HugeiconsIcon icon={Search01Icon} strokeWidth={2} />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search voices…"
            aria-label="Search voices"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </InputGroup>
      </div>

      {voices.isLoading ? (
        <ListSkeleton rows={6} />
      ) : voices.isError ? (
        <QueryError
          title="Could not load voices"
          error={voices.error}
          onRetry={() => void voices.refetch()}
        />
      ) : list.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>
              {q ? "No voices match this search" : "No voices here yet"}
            </EmptyTitle>
            <EmptyDescription>
              {q
                ? "Try a different search."
                : type === "built-in"
                  ? "Built-in voices sync from the provider."
                  : type === "custom"
                    ? "Clone a voice from a sample you have permission to use."
                    : "Design a synthetic voice from a description."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Labels</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((voice) => (
                  <TableRow key={voice.id}>
                    <TableCell>
                      <VoicePreviewButton voice={voice} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="max-w-64 truncate font-medium">
                          {voice.name}
                        </span>
                        <DeletionBadge voice={voice} />
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {voice.language ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">
                      {voice.labels ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <VoiceActions voice={voice} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-2 md:hidden">
            {list.map((voice) => (
              <Card key={voice.id} size="sm">
                <CardContent className="flex items-center gap-2">
                  <VoicePreviewButton voice={voice} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-2 truncate text-xs font-medium">
                      {voice.name}
                    </span>
                    <span className="truncate text-[0.7rem] text-muted-foreground">
                      {voice.language ?? ""}
                      {voice.labels ? ` · ${voice.labels}` : ""}
                    </span>
                  </div>
                  <DeletionBadge voice={voice} />
                  <VoiceActions voice={voice} />
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
