/** Cover form state shared by the page and the form component. */

import type { CoverInput, Upload } from "@/lib/api/studio-types"
import { validateCoverInput } from "@/lib/studio-validation"

export interface CoverFormState {
  upload: Upload | null
  rightsConfirmed: boolean
  lyrics: string
  melodyAdherence: "high" | "main_melody"
  musicDescription: string
  style: string
  title: string
  vocalGender: "male" | "female" | null
}

export const EMPTY_COVER_FORM: CoverFormState = {
  upload: null,
  rightsConfirmed: false,
  lyrics: "",
  melodyAdherence: "high",
  musicDescription: "",
  style: "",
  title: "",
  vocalGender: null,
}

/** Contract payload from the form state (only meaningful when valid). */
export function coverInputFromState(state: CoverFormState): CoverInput {
  const input: CoverInput = {
    uploadId: state.upload?.id ?? "",
    lyrics: state.lyrics.trim(),
    melodyAdherence: state.melodyAdherence,
    rightsConfirmed: true,
  }
  const description = state.musicDescription.trim()
  const style = state.style.trim()
  const title = state.title.trim()
  if (description) input.musicDescription = description
  if (style) input.style = style
  if (title) input.title = title
  if (state.vocalGender) input.vocalGender = state.vocalGender
  return input
}

export function validateCoverForm(
  state: CoverFormState
): Record<string, string> {
  return validateCoverInput({
    ...coverInputFromState(state),
    musicDescription: state.musicDescription,
    style: state.style,
    title: state.title,
    rightsConfirmed: state.rightsConfirmed,
  })
}
