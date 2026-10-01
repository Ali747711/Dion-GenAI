import * as React from "react"
import { MusicNoteSquare01Icon } from "@hugeicons/core-free-icons"

import { CoverForm } from "@/components/cover/cover-form"
import { VariantCard } from "@/components/jobs/variant-card"
import { PageHeader } from "@/components/shared/page-header"
import { CostPreview } from "@/components/studio/cost-preview"
import { StudioJobPanel } from "@/components/studio/studio-job-panel"
import { CapabilityNotice } from "@/components/studio/capability-notice"
import type { Job } from "@/lib/api/types"
import { isTerminalJobStatus } from "@/lib/api/types"
import {
  coverInputFromState,
  EMPTY_COVER_FORM,
  validateCoverForm,
  type CoverFormState,
} from "@/lib/cover-form"

/** Cover studio (PRD F2): source upload, recognition, editable lyrics. */
export function CreateCoverPage() {
  const [state, setState] = React.useState<CoverFormState>(EMPTY_COVER_FORM)
  const [latestJobId, setLatestJobId] = React.useState<string>()
  const [blocked, setBlocked] = React.useState(false)

  const isValid = Object.keys(validateCoverForm(state)).length === 0

  const handleSubmitted = (job: Job) => {
    setLatestJobId(job.id)
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Covers"
        description="Re-sing an uploaded song with new style, lyrics, and voice — two variants per submission."
      />
      <CapabilityNotice capabilityKey="cover" />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <CoverForm
          state={state}
          onStateChange={setState}
          blocked={blocked}
          onSubmitted={handleSubmitted}
        />
        <div className="flex flex-col gap-4">
          <CostPreview
            kind="cover"
            input={coverInputFromState(state)}
            isValid={isValid}
            description="Cover · 2 variants generated per submission"
            onBlockedChange={setBlocked}
          />
          <StudioJobPanel
            kind="cover"
            jobId={latestJobId}
            title="Latest cover"
            emptyIcon={MusicNoteSquare01Icon}
            emptyTitle="No covers yet"
            emptyDescription="Your latest cover pair will appear here once you submit one."
          >
            {(job) => (
              <>
                {job.variants.map((variant) => (
                  <VariantCard
                    key={variant.id}
                    variant={variant}
                    jobFinished={isTerminalJobStatus(job.status)}
                  />
                ))}
              </>
            )}
          </StudioJobPanel>
        </div>
      </div>
    </div>
  )
}
