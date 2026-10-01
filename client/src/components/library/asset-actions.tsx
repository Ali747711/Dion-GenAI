import { HugeiconsIcon } from "@hugeicons/react"
import {
  Download01Icon,
  FavouriteIcon,
  PauseIcon,
  PlayIcon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import type { Asset } from "@/lib/api/types"
import { useUpdateAsset } from "@/hooks/use-assets"
import { usePlayer } from "@/providers/player-provider"

export function PlayAssetButton({
  asset,
  queue,
}: {
  asset: Asset
  queue?: Asset[]
}) {
  const player = usePlayer()
  const isCurrent = player.current?.id === asset.id
  const isPlaying = isCurrent && player.isPlaying

  return (
    <Button
      variant={isCurrent ? "default" : "ghost"}
      size="icon-sm"
      aria-label={isPlaying ? `Pause ${asset.title}` : `Play ${asset.title}`}
      onClick={() => {
        if (isPlaying) {
          player.toggle()
        } else {
          player.play(asset, queue)
        }
      }}
    >
      <HugeiconsIcon icon={isPlaying ? PauseIcon : PlayIcon} strokeWidth={2} />
    </Button>
  )
}

export function DownloadAssetButton({ asset }: { asset: Asset }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Download ${asset.title}`}
      nativeButton={false}
      render={
        <a href={asset.downloadUrl} download>
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
        </a>
      }
    />
  )
}

export function FavoriteAssetButton({ asset }: { asset: Asset }) {
  const update = useUpdateAsset()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={
        asset.favorite
          ? `Remove ${asset.title} from favorites`
          : `Add ${asset.title} to favorites`
      }
      aria-pressed={asset.favorite}
      disabled={update.isPending}
      onClick={() =>
        update.mutate({ id: asset.id, patch: { favorite: !asset.favorite } })
      }
    >
      <HugeiconsIcon
        icon={FavouriteIcon}
        strokeWidth={2}
        className={asset.favorite ? "fill-primary text-primary" : ""}
      />
    </Button>
  )
}
