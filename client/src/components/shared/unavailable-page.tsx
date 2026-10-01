import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"

import { PageHeader } from "@/components/shared/page-header"
import { QueryError } from "@/components/shared/query-error"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { CapabilityKey } from "@/lib/api/types"
import { useCapabilities, useCapability } from "@/hooks/use-workspace"

interface UnavailablePageProps {
  capabilityKey: CapabilityKey
  title: string
  icon: IconSvgElement
}

/**
 * Honest gated state for R2–R4 studios: explains why the studio is not
 * available yet, with no working-looking paid controls (PRD section 2).
 */
export function UnavailablePage({
  capabilityKey,
  title,
  icon,
}: UnavailablePageProps) {
  const { capability, isLoading } = useCapability(capabilityKey)
  const { error, refetch } = useCapabilities()

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={title} />
      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : error ? (
        <QueryError
          title="Could not load capability status"
          error={error}
          onRetry={() => void refetch()}
        />
      ) : (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>
              Not available yet
              {capability ? (
                <Badge variant="outline" className="ml-2">
                  {capability.release}
                </Badge>
              ) : null}
            </EmptyTitle>
            <EmptyDescription>
              {capability?.reason ??
                "This studio is part of a later release and has not been verified yet. It will appear here once its provider contract, pricing, and safety checks are confirmed."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}
