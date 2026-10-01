import { DionMascot } from "@/components/shared/dion-mascot"
import type { Job } from "@/lib/api/types"
import {
  ACTIVE_JOB_STATUSES,
  ERROR_CLASS_MESSAGES,
  JOB_STATUS_META,
  RECOVERABLE_ERROR_CLASSES,
} from "@/lib/job-meta"

/**
 * One mascot per visible job state, always beside the real status:
 * creating while in flight, success when the job succeeded, confused only
 * for failed jobs whose error class has a real recovery action. Every other
 * error keeps its plain-text message without an illustration.
 */
export function JobStateIllustration({ job }: { job: Job }) {
  if (ACTIVE_JOB_STATUSES.includes(job.status)) {
    return (
      <div className="flex items-center gap-3">
        <DionMascot variant="creating" size="sm" entrance />
        <p className="text-xs text-muted-foreground">
          Dion is on it — current status: {JOB_STATUS_META[job.status].label}.
          Live per-variant progress appears below as the provider reports it.
        </p>
      </div>
    )
  }

  if (job.status === "succeeded") {
    return (
      <div className="flex items-center gap-3">
        <DionMascot variant="success" size="xs" entrance />
        <p className="text-xs text-muted-foreground">
          Generation finished — the results below are ready to play.
        </p>
      </div>
    )
  }

  if (job.errorClass) {
    const message = ERROR_CLASS_MESSAGES[job.errorClass]
    const recoverable =
      job.status === "failed" && RECOVERABLE_ERROR_CLASSES.has(job.errorClass)
    if (!recoverable) {
      return <p className="text-xs text-destructive">{message}</p>
    }
    return (
      <div className="flex items-center gap-3">
        <DionMascot variant="confused" size="xs" entrance />
        <p className="text-xs text-destructive">{message}</p>
      </div>
    )
  }

  return null
}
