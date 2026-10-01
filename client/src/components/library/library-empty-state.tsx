import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import { LibraryIcon } from "@hugeicons/core-free-icons"

import { DionMascot } from "@/components/shared/dion-mascot"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

interface LibraryEmptyStateProps {
  favoriteOnly: boolean
  /** True when any narrowing filter besides the favorites toggle is active. */
  filtered: boolean
}

/**
 * Empty results: one mascot per state — favorites view or first use.
 * Any narrowing filter keeps the plain "no match" state instead.
 */
export function LibraryEmptyState({
  favoriteOnly,
  filtered,
}: LibraryEmptyStateProps) {
  if (filtered) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={LibraryIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>No tracks match these filters</EmptyTitle>
          <EmptyDescription>
            Try broadening the search or clearing filters.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  if (favoriteOnly) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia>
            <DionMascot variant="favorite" size="lg" />
          </EmptyMedia>
          <EmptyTitle>No favorites yet</EmptyTitle>
          <EmptyDescription>
            Tap the heart on any track and it will show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia>
          <DionMascot variant="launch" size="lg" />
        </EmptyMedia>
        <EmptyTitle>Create your first track</EmptyTitle>
        <EmptyDescription>
          Generate your first song and both variants will land here.
        </EmptyDescription>
      </EmptyHeader>
      <Button
        nativeButton={false}
        render={<Link to="/create/music">Create music</Link>}
      />
    </Empty>
  )
}
