/**
 * Voice previews play through the shared player (one source at a time, no
 * autoplay on load) by wrapping a Voice into a minimal Asset shape. The
 * pseudo-id is prefixed so refresh restore and track links can ignore it.
 */

import type { Voice } from "@/lib/api/studio-types"
import type { Asset } from "@/lib/api/types"

export const VOICE_PREVIEW_ID_PREFIX = "voice-preview:"

export function isVoicePreviewAssetId(id: string): boolean {
  return id.startsWith(VOICE_PREVIEW_ID_PREFIX)
}

/** Null when the voice has no server-cached preview. */
export function voicePreviewAsset(voice: Voice): Asset | null {
  if (!voice.previewUrl) return null
  return {
    id: `${VOICE_PREVIEW_ID_PREFIX}${voice.id}`,
    kind: "audio",
    source: "voice_preview",
    title: `${voice.name} (preview)`,
    jobId: null,
    variantId: null,
    variantIndex: null,
    siblingAssetId: null,
    projectId: null,
    projectName: null,
    mimeType: "audio/mpeg",
    bytes: 0,
    durationSeconds: null,
    favorite: false,
    archived: false,
    lyrics: null,
    prompt: null,
    tags: [],
    createdAt: voice.createdAt,
    contentUrl: voice.previewUrl,
    downloadUrl: voice.previewUrl,
  }
}
