import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getBudget,
  getCapabilities,
  getConnection,
  patchBudget,
} from "@/lib/api/endpoints"
import type { BudgetConfig, Capability, CapabilityKey } from "@/lib/api/types"
import { useAuth } from "@/providers/auth-provider"

export function useCapabilities() {
  const { status } = useAuth()
  return useQuery({
    queryKey: ["capabilities"],
    queryFn: getCapabilities,
    staleTime: 5 * 60_000,
    enabled: status === "authenticated",
  })
}

export function useCapability(key: CapabilityKey): {
  capability: Capability | undefined
  isLoading: boolean
} {
  const { data, isLoading } = useCapabilities()
  return {
    capability: data?.find((capability) => capability.key === key),
    isLoading,
  }
}

export function useConnection() {
  const { status } = useAuth()
  return useQuery({
    queryKey: ["connection"],
    queryFn: getConnection,
    staleTime: 60_000,
    enabled: status === "authenticated",
  })
}

export function useBudget() {
  return useQuery({ queryKey: ["budget"], queryFn: getBudget })
}

export function useUpdateBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<BudgetConfig>) => patchBudget(patch),
    onSuccess: (budget) => {
      queryClient.setQueryData(["budget"], budget)
      void queryClient.invalidateQueries({ queryKey: ["usage"] })
      // The USD cap gates capabilities (cash kinds), so refresh them too.
      void queryClient.invalidateQueries({ queryKey: ["capabilities"] })
    },
  })
}
