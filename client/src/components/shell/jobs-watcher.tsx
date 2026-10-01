import * as React from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { listJobs } from "@/lib/api/endpoints"
import type { Job, JobStatus } from "@/lib/api/types"
import { isTerminalJobStatus } from "@/lib/api/types"
import { JOB_STATUS_META } from "@/lib/job-meta"
import { jobDisplayTitle } from "@/lib/studio-meta"
import { JOB_POLL_INTERVAL_MS } from "@/hooks/use-jobs"

function jobTitle(job: Job): string {
  return jobDisplayTitle(job)
}

/** Only announce transitions the user actually cares about, not every tick. */
function isMeaningfulTransition(
  previous: JobStatus,
  current: JobStatus
): boolean {
  if (previous === current) return false
  if (isTerminalJobStatus(current)) return true
  return current === "running"
}

/**
 * Watches recent jobs, raises a toast and updates a polite live region when a
 * job meaningfully changes status (PRD section 6: announce politely, never
 * announce every polling tick).
 */
export function JobsWatcher() {
  const queryClient = useQueryClient()
  const [announcement, setAnnouncement] = React.useState("")
  const statusesRef = React.useRef(new Map<string, JobStatus>())

  const { data } = useQuery({
    queryKey: ["jobs", "watcher"],
    queryFn: async () => (await listJobs({ limit: 10 })).data,
    refetchInterval: (query) => {
      const jobs = query.state.data
      const hasActive = jobs?.some((job) => !isTerminalJobStatus(job.status))
      return hasActive ? JOB_POLL_INTERVAL_MS : false
    },
  })

  React.useEffect(() => {
    if (!data) return
    const seen = statusesRef.current
    for (const job of data) {
      const previous = seen.get(job.id)
      seen.set(job.id, job.status)
      if (
        previous === undefined ||
        !isMeaningfulTransition(previous, job.status)
      ) {
        continue
      }
      const meta = JOB_STATUS_META[job.status]
      const message = `${jobTitle(job)}: ${meta.label}`
      setAnnouncement(message)
      if (isTerminalJobStatus(job.status)) {
        // Finished jobs usually created assets; refresh lists showing them.
        void queryClient.invalidateQueries({ queryKey: ["assets"] })
      }
      if (job.status === "succeeded") {
        toast.success(message, {
          description:
            job.kind === "music" || job.kind === "cover"
              ? "Both variants are ready."
              : "The result is ready.",
        })
      } else if (job.status === "running") {
        toast.info(message)
      } else if (
        job.status === "failed" ||
        job.status === "submission_unknown" ||
        job.status === "reconciliation_required"
      ) {
        toast.error(message, { description: meta.description })
      } else {
        toast.info(message, { description: meta.description })
      }
    }
  }, [data, queryClient])

  return (
    <div aria-live="polite" role="status" className="sr-only">
      {announcement}
    </div>
  )
}
