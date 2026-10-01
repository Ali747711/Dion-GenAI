import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  getAsset,
  listAssets,
  patchAsset,
  type AssetListParams,
  type AssetPatch,
} from "@/lib/api/endpoints"
import type { Asset } from "@/lib/api/types"
import { isVoicePreviewAssetId } from "@/lib/voice-preview"

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ["asset", id],
    queryFn: () => getAsset(id as string),
    // Voice previews are player-only pseudo-assets with no server record.
    enabled: Boolean(id) && !isVoicePreviewAssetId(id ?? ""),
  })
}

export function useAssetList(params: AssetListParams = {}) {
  return useInfiniteQuery({
    queryKey: ["assets", params],
    queryFn: ({ pageParam }) =>
      listAssets({ ...params, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

export function useRecentAssets(limit = 6) {
  return useQuery({
    queryKey: ["assets", "recent", limit],
    queryFn: async () => {
      const page = await listAssets({
        limit,
        sort: "createdAt",
        order: "desc",
        archived: false,
      })
      return page.data
    },
  })
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: AssetPatch }) =>
      patchAsset(id, patch),
    onSuccess: (asset: Asset) => {
      queryClient.setQueryData(["asset", asset.id], asset)
      void queryClient.invalidateQueries({ queryKey: ["assets"] })
      void queryClient.invalidateQueries({ queryKey: ["projects"] })
      void queryClient.invalidateQueries({ queryKey: ["project"] })
    },
  })
}
