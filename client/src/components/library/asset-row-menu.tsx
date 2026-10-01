import { Link } from "react-router"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Archive02Icon,
  Download01Icon,
  Folder01Icon,
  MoreHorizontalIcon,
  MusicNote01Icon,
  PencilEdit01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Asset } from "@/lib/api/types"
import { useUpdateAsset } from "@/hooks/use-assets"

interface AssetRowMenuProps {
  asset: Asset
  onRename: (asset: Asset) => void
  onAssignProject: (asset: Asset) => void
}

/** Overflow actions for a library row: rename, project, archive, download. */
export function AssetRowMenu({
  asset,
  onRename,
  onAssignProject,
}: AssetRowMenuProps) {
  const update = useUpdateAsset()

  const toggleArchive = () => {
    update.mutate(
      { id: asset.id, patch: { archived: !asset.archived } },
      {
        onSuccess: (updated) => {
          toast.success(
            updated.archived
              ? "Track archived locally (provider history and charges are unaffected)"
              : "Track restored from archive"
          )
        },
        onError: (cause) => {
          toast.error(cause instanceof Error ? cause.message : "Update failed.")
        },
      }
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`More actions for ${asset.title}`}
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={
              <Link to={`/tracks/${asset.id}`}>
                <HugeiconsIcon icon={MusicNote01Icon} strokeWidth={2} />
                Track details
              </Link>
            }
          />
          <DropdownMenuItem onClick={() => onRename(asset)}>
            <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAssignProject(asset)}>
            <HugeiconsIcon icon={Folder01Icon} strokeWidth={2} />
            Assign to project
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <a href={asset.downloadUrl} download>
                <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
                Download
              </a>
            }
          />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={toggleArchive}>
            <HugeiconsIcon icon={Archive02Icon} strokeWidth={2} />
            {asset.archived ? "Unarchive" : "Archive locally"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
