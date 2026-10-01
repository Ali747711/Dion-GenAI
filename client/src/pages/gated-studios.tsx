import { AiImageIcon, WorkflowCircle01Icon } from "@hugeicons/core-free-icons"

import { UnavailablePage } from "@/components/shared/unavailable-page"

/** R3–R4 studios: honest gated pages driven by the capabilities endpoint. */

export function MediaStudioPage() {
  return (
    <UnavailablePage capabilityKey="media" title="Media" icon={AiImageIcon} />
  )
}

export function WorkflowsPage() {
  return (
    <UnavailablePage
      capabilityKey="workflows"
      title="Workflows"
      icon={WorkflowCircle01Icon}
    />
  )
}
