import type { IconSvgElement } from "@hugeicons/react"
import {
  AiImageIcon,
  AiTranscribeAudioIcon,
  AiVoiceIcon,
  AudioWave01Icon,
  Coins01Icon,
  Folder01Icon,
  Home01Icon,
  LibraryIcon,
  Mic01Icon,
  MusicNote01Icon,
  MusicNoteSquare01Icon,
  Queue01Icon,
  Settings01Icon,
  WorkflowCircle01Icon,
} from "@hugeicons/core-free-icons"

import type { CapabilityKey } from "@/lib/api/types"

export interface NavItem {
  title: string
  url: string
  icon: IconSvgElement
  /** When set, the item is gated by this capability (release badge shown). */
  capability?: CapabilityKey
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { title: "Overview", url: "/", icon: Home01Icon },
      { title: "Create", url: "/create/music", icon: MusicNote01Icon },
      { title: "Library", url: "/library", icon: LibraryIcon },
      { title: "Projects", url: "/projects", icon: Folder01Icon },
    ],
  },
  {
    label: "Studios",
    items: [
      {
        title: "Covers",
        url: "/create/cover",
        icon: MusicNoteSquare01Icon,
        capability: "cover",
      },
      {
        title: "Sound",
        url: "/studio/sound",
        icon: AudioWave01Icon,
        capability: "sound",
      },
      {
        title: "Speech",
        url: "/studio/speech",
        icon: AiVoiceIcon,
        capability: "speech",
      },
      { title: "Voices", url: "/voices", icon: Mic01Icon, capability: "voices" },
      {
        title: "Transcribe",
        url: "/studio/transcribe",
        icon: AiTranscribeAudioIcon,
        capability: "transcribe",
      },
      {
        title: "Media",
        url: "/studio/media",
        icon: AiImageIcon,
        capability: "media",
      },
      {
        title: "Workflows",
        url: "/workflows",
        icon: WorkflowCircle01Icon,
        capability: "workflows",
      },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Jobs", url: "/jobs", icon: Queue01Icon },
      { title: "Usage", url: "/usage", icon: Coins01Icon },
      { title: "Settings", url: "/settings", icon: Settings01Icon },
    ],
  },
]

/** Breadcrumb labels for static route segments. */
export const ROUTE_LABELS: Record<string, string> = {
  "": "Overview",
  create: "Create",
  music: "Music",
  cover: "Covers",
  library: "Library",
  tracks: "Tracks",
  projects: "Projects",
  jobs: "Jobs",
  studio: "Studio",
  sound: "Sound",
  speech: "Speech",
  voices: "Voices",
  transcribe: "Transcribe",
  media: "Media",
  workflows: "Workflows",
  usage: "Usage",
  settings: "Settings",
}
