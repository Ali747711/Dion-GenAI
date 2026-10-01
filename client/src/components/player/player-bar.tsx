import { Link } from "react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDataTransferHorizontalIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PreviousIcon,
  VolumeHighIcon,
  VolumeMute01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { formatDuration } from "@/lib/format"
import { isVoicePreviewAssetId } from "@/lib/voice-preview"
import { usePlayer } from "@/providers/player-provider"

const VARIANT_LABELS = ["Variant A", "Variant B"] as const

/**
 * Persistent bottom player. Always rendered so the layout clearance is
 * stable; shows a quiet idle state when nothing is selected.
 */
export function PlayerBar() {
  const player = usePlayer()
  const { current } = player

  return (
    <footer
      aria-label="Player"
      className="sticky bottom-0 z-20 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      {current ? (
        <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 sm:flex-nowrap">
          <div className="flex min-w-0 flex-1 basis-40 flex-col">
            <Link
              to={
                isVoicePreviewAssetId(current.id)
                  ? "/voices"
                  : `/tracks/${current.id}`
              }
              className="truncate text-xs font-medium hover:underline"
            >
              {current.title}
            </Link>
            <span className="truncate text-[0.65rem] text-muted-foreground">
              {current.variantIndex !== null
                ? VARIANT_LABELS[current.variantIndex]
                : isVoicePreviewAssetId(current.id)
                  ? "Voice preview"
                  : "Track"}
              {current.projectName ? ` · ${current.projectName}` : ""}
            </span>
            {player.loadError ? (
              <span className="truncate text-[0.65rem] text-destructive">
                {player.loadError}
              </span>
            ) : null}
          </div>

          <div className="order-3 flex w-full items-center gap-2 sm:order-none sm:w-auto sm:flex-2 sm:basis-80">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous track"
              disabled={player.queue.length < 2}
              onClick={player.previous}
            >
              <HugeiconsIcon icon={PreviousIcon} strokeWidth={2} />
            </Button>
            <Button
              variant="default"
              size="icon"
              aria-label={player.isPlaying ? "Pause" : "Play"}
              onClick={player.toggle}
            >
              <HugeiconsIcon
                icon={player.isPlaying ? PauseIcon : PlayIcon}
                strokeWidth={2}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next track"
              disabled={player.queue.length < 2}
              onClick={player.next}
            >
              <HugeiconsIcon icon={NextIcon} strokeWidth={2} />
            </Button>
            <span className="w-9 text-right font-mono text-[0.65rem] text-muted-foreground tabular-nums">
              {formatDuration(player.currentTime)}
            </span>
            <Slider
              aria-label="Seek"
              className="min-w-0 flex-1"
              min={0}
              max={Math.max(1, player.duration)}
              step={1}
              value={[Math.min(player.currentTime, player.duration || 0)]}
              onValueChange={(value) => {
                const position = Array.isArray(value) ? value[0] : value
                player.seek(position)
              }}
            />
            <span className="w-9 font-mono text-[0.65rem] text-muted-foreground tabular-nums">
              {formatDuration(player.duration)}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {current.siblingAssetId ? (
              <Button
                variant="outline"
                size="sm"
                aria-label="Switch to the other variant"
                onClick={player.switchVariant}
              >
                <HugeiconsIcon
                  icon={ArrowDataTransferHorizontalIcon}
                  data-icon="inline-start"
                />
                <span className="hidden md:inline">
                  {current.variantIndex === 0 ? "Play B" : "Play A"}
                </span>
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={player.muted ? "Unmute" : "Mute"}
              onClick={player.toggleMute}
            >
              <HugeiconsIcon
                icon={player.muted ? VolumeMute01Icon : VolumeHighIcon}
                strokeWidth={2}
              />
            </Button>
            <Slider
              aria-label="Volume"
              className="mx-1.5 hidden w-20 md:flex"
              min={0}
              max={1}
              step={0.05}
              value={[player.muted ? 0 : player.volume]}
              onValueChange={(value) => {
                const level = Array.isArray(value) ? value[0] : value
                player.setVolume(level)
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-10 items-center px-4 py-2">
          <p className="text-[0.7rem] text-muted-foreground">
            Nothing playing. Pick a track from your{" "}
            <Link to="/library" className="underline underline-offset-2">
              library
            </Link>
            . <kbd className="rounded border px-1 font-mono">Space</kbd> toggles
            playback.
          </p>
        </div>
      )}
    </footer>
  )
}
