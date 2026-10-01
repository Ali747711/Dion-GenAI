import { Badge } from "@/components/ui/badge"
import type { JobStatus, VariantStatus } from "@/lib/api/types"
import { JOB_STATUS_META, VARIANT_STATUS_META } from "@/lib/job-meta"

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const meta = JOB_STATUS_META[status]
  return <Badge variant={meta.tone}>{meta.label}</Badge>
}

export function VariantStatusBadge({ status }: { status: VariantStatus }) {
  const meta = VARIANT_STATUS_META[status]
  return <Badge variant={meta.tone}>{meta.label}</Badge>
}
