import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  deleteVoice,
  listVoices,
  renameVoice,
  type VoiceListParams,
} from "@/lib/api/studio-endpoints"
import type { Voice } from "@/lib/api/studio-types"

export function useVoices(params: VoiceListParams = {}) {
  return useQuery({
    queryKey: ["voices", params],
    queryFn: async () => (await listVoices(params)).data,
  })
}

export function useRenameVoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      renameVoice(id, name),
    onSuccess: (voice: Voice) => {
      queryClient.setQueryData(["voice", voice.id], voice)
      void queryClient.invalidateQueries({ queryKey: ["voices"] })
    },
  })
}

export function useDeleteVoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteVoice(id),
    onSuccess: (voice: Voice) => {
      queryClient.setQueryData(["voice", voice.id], voice)
      void queryClient.invalidateQueries({ queryKey: ["voices"] })
    },
  })
}
