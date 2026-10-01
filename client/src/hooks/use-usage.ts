import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  createReconciliation,
  getUsage,
  listLedger,
} from "@/lib/api/endpoints"

export function useUsage() {
  return useQuery({
    queryKey: ["usage"],
    queryFn: getUsage,
    refetchInterval: 30_000,
  })
}

export function useLedger(limit = 25) {
  return useInfiniteQuery({
    queryKey: ["ledger", limit],
    queryFn: ({ pageParam }) =>
      listLedger({ limit, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })
}

export function useCreateReconciliation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { credits: number; reason: string; source: string }) =>
      createReconciliation(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["usage"] })
      void queryClient.invalidateQueries({ queryKey: ["ledger"] })
    },
  })
}
