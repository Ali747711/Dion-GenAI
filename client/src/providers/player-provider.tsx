import * as React from "react"

import { getAsset } from "@/lib/api/endpoints"
import type { Asset } from "@/lib/api/types"
import { isVoicePreviewAssetId } from "@/lib/voice-preview"
import { useAuth } from "@/providers/auth-provider"

interface PlayerState {
  current: Asset | null
  queue: Asset[]
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  muted: boolean
  loadError: string | null
  /** Start playback of an asset; optional queue defines next/previous. */
  play: (asset: Asset, queue?: Asset[]) => void
  toggle: () => void
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  next: () => void
  previous: () => void
  /** Switch to the other variant of the same generation pair. */
  switchVariant: () => void
}

const PlayerContext = React.createContext<PlayerState | undefined>(undefined)

const SELECTION_KEY = "ms:player-selection"
const VOLUME_KEY = "ms:player-volume"

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return Boolean(
    target.closest(
      "input, textarea, select, button, a, [contenteditable='true'], " +
        "[role='slider'], [role='menuitem'], [role='option'], [role='tab'], " +
        "[role='checkbox'], [role='switch'], [role='radio'], [role='combobox'], [role='dialog']"
    )
  )
}

function readStoredVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY)
    const value = raw === null ? NaN : Number(raw)
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.9
  } catch {
    return 0.9
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const [current, setCurrent] = React.useState<Asset | null>(null)
  const [queue, setQueue] = React.useState<Asset[]>([])
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [volume, setVolumeState] = React.useState(readStoredVolume)
  const [muted, setMuted] = React.useState(false)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const restoredRef = React.useRef(false)

  const load = React.useCallback((asset: Asset, autoplay: boolean) => {
    const audio = audioRef.current
    if (!audio) return
    setCurrent(asset)
    setLoadError(null)
    setCurrentTime(0)
    setDuration(asset.durationSeconds ?? 0)
    audio.src = asset.contentUrl
    try {
      if (isVoicePreviewAssetId(asset.id)) {
        // Voice previews are pseudo-assets; they cannot be restored via the
        // assets API after a refresh, so they are not persisted.
        sessionStorage.removeItem(SELECTION_KEY)
      } else {
        sessionStorage.setItem(SELECTION_KEY, asset.id)
      }
    } catch {
      // Selection restore is best-effort only.
    }
    if (autoplay) {
      audio.play().catch(() => {
        setIsPlaying(false)
        setLoadError("Playback could not start. Try pressing play again.")
      })
    }
  }, [])

  const play = React.useCallback(
    (asset: Asset, nextQueue?: Asset[]) => {
      const audio = audioRef.current
      if (!audio) return
      if (nextQueue) setQueue(nextQueue)
      else setQueue((existing) => (existing.length > 0 ? existing : [asset]))
      if (current?.id === asset.id && audio.src) {
        audio.play().catch(() => setLoadError("Playback could not start."))
        return
      }
      load(asset, true)
    },
    [current?.id, load]
  )

  const toggle = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio || !current) return
    if (!audio.src) {
      // Restored selection after a refresh: the source loads lazily on the
      // first user-initiated play (never automatically).
      load(current, true)
      return
    }
    if (audio.paused) {
      audio.play().catch(() => setLoadError("Playback could not start."))
    } else {
      audio.pause()
    }
  }, [current, load])

  const seek = React.useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = seconds
    setCurrentTime(seconds)
  }, [])

  const setVolume = React.useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value))
    setVolumeState(clamped)
    setMuted(false)
    try {
      localStorage.setItem(VOLUME_KEY, String(clamped))
    } catch {
      // Volume persistence is best-effort.
    }
  }, [])

  const toggleMute = React.useCallback(() => {
    setMuted((value) => !value)
  }, [])

  const step = React.useCallback(
    (offset: number) => {
      if (!current || queue.length === 0) return
      const index = queue.findIndex((asset) => asset.id === current.id)
      const nextIndex = index + offset
      if (index === -1 || nextIndex < 0 || nextIndex >= queue.length) return
      load(queue[nextIndex], true)
    },
    [current, queue, load]
  )

  const next = React.useCallback(() => step(1), [step])
  const previous = React.useCallback(() => step(-1), [step])

  const switchVariant = React.useCallback(() => {
    if (!current?.siblingAssetId) return
    getAsset(current.siblingAssetId)
      .then((sibling) => {
        setQueue((existing) =>
          existing.map((asset) => (asset.id === current.id ? sibling : asset))
        )
        load(sibling, true)
      })
      .catch(() => setLoadError("The other variant could not be loaded."))
  }, [current, load])

  // Apply volume/mute to the element.
  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])

  // Restore the previous selection after refresh — never autoplaying.
  React.useEffect(() => {
    if (status !== "authenticated" || restoredRef.current) return
    restoredRef.current = true
    const stored = ((): string | null => {
      try {
        return sessionStorage.getItem(SELECTION_KEY)
      } catch {
        return null
      }
    })()
    if (!stored || isVoicePreviewAssetId(stored)) return
    getAsset(stored)
      .then((asset) => {
        setCurrent((existing) => existing ?? asset)
        setQueue((existing) => (existing.length > 0 ? existing : [asset]))
        setDuration((existing) =>
          existing > 0 ? existing : (asset.durationSeconds ?? 0)
        )
      })
      .catch(() => {
        // Stored selection no longer exists; ignore.
      })
  }, [status])

  // Space toggles playback when focus is outside editable/interactive controls.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditableTarget(event.target)) return
      event.preventDefault()
      toggle()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [toggle])

  const value = React.useMemo(
    () => ({
      current,
      queue,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      loadError,
      play,
      toggle,
      seek,
      setVolume,
      toggleMute,
      next,
      previous,
      switchVariant,
    }),
    [
      current,
      queue,
      isPlaying,
      currentTime,
      duration,
      volume,
      muted,
      loadError,
      play,
      toggle,
      seek,
      setVolume,
      toggleMute,
      next,
      previous,
      switchVariant,
    ]
  )

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Single shared audio element: one source plays at a time. */}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onDurationChange={(event) => {
          const value = event.currentTarget.duration
          if (Number.isFinite(value)) setDuration(value)
        }}
        onError={() => {
          if (current) setLoadError("This track could not be loaded.")
        }}
      />
    </PlayerContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayer(): PlayerState {
  const context = React.useContext(PlayerContext)
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider")
  }
  return context
}
