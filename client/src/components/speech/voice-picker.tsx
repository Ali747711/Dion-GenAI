import { HugeiconsIcon } from "@hugeicons/react"
import { PauseIcon, PlayIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { Voice, VoiceType } from "@/lib/api/studio-types"
import { voicePreviewAsset } from "@/lib/voice-preview"
import { useVoices } from "@/hooks/use-voices"
import { usePlayer } from "@/providers/player-provider"

const TYPE_ORDER: readonly VoiceType[] = ["built-in", "custom", "designed"]
const TYPE_LABELS: Record<VoiceType, string> = {
  "built-in": "Built-in",
  custom: "Custom",
  designed: "Designed",
}

/** Play/pause toggle for a voice's server-cached preview via the shared player. */
export function VoicePreviewButton({ voice }: { voice: Voice }) {
  const player = usePlayer()
  const asset = voicePreviewAsset(voice)
  if (!asset) return null
  const isCurrent = player.current?.id === asset.id
  const isPlaying = isCurrent && player.isPlaying

  return (
    <Button
      type="button"
      variant={isCurrent ? "default" : "ghost"}
      size="icon-sm"
      aria-label={
        isPlaying
          ? `Pause preview of ${voice.name}`
          : `Play preview of ${voice.name}`
      }
      onClick={() => {
        if (isPlaying) player.toggle()
        else player.play(asset)
      }}
    >
      <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} strokeWidth={2} />
    </Button>
  )
}

interface VoicePickerProps {
  value: string
  onValueChange: (voiceId: string) => void
  error?: string
}

/** Voice selection grouped by built-in / custom / designed, with preview. */
export function VoicePicker({ value, onValueChange, error }: VoicePickerProps) {
  const voices = useVoices()
  const usable = (voices.data ?? []).filter(
    (voice) => voice.deletionStatus === "active"
  )
  const selected = usable.find((voice) => voice.id === value)
  const items = usable.map((voice) => ({ label: voice.name, value: voice.id }))

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor="speech-voice">Voice</FieldLabel>
      {voices.isLoading ? (
        <Skeleton className="h-9 w-full" />
      ) : (
        <div className="flex items-center gap-1.5">
          <Select
            items={items}
            value={value || null}
            onValueChange={(next: unknown) => {
              if (typeof next === "string") onValueChange(next)
            }}
          >
            <SelectTrigger
              id="speech-voice"
              className="w-full"
              aria-invalid={error ? true : undefined}
            >
              <SelectValue placeholder="Pick a voice" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_ORDER.map((type) => {
                const group = usable.filter((voice) => voice.type === type)
                if (group.length === 0) return null
                return (
                  <SelectGroup key={type}>
                    <SelectLabel>{TYPE_LABELS[type]}</SelectLabel>
                    {group.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )
              })}
            </SelectContent>
          </Select>
          {selected ? <VoicePreviewButton voice={selected} /> : null}
        </div>
      )}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : voices.isError ? (
        <FieldError>Voices could not be loaded. Retry from /voices.</FieldError>
      ) : (
        <FieldDescription>
          {selected
            ? `${TYPE_LABELS[selected.type]} voice${selected.language ? ` · ${selected.language}` : ""}`
            : "Built-in, cloned, and designed voices are all usable here."}
        </FieldDescription>
      )}
    </Field>
  )
}
