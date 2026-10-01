import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import {
  cancelJob,
  createEstimate,
  createJob,
  getJob,
  listJobs,
  type CreateJobPayload,
  type EstimateRequest,
  type JobListParams,
} from "@/lib/api/endpoints"
import type { Job, JobKind } from "@/lib/api/types"
import { isTerminalJobStatus } from "@/lib/api/types"

export const JOB_POLL_INTERVAL_MS = 3000

/** Poll a single job every 3 s until it reaches a terminal status. */
export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const job = query.state.data
      if (!job || isTerminalJobStatus(job.status)) return false
      return JOB_POLL_INTERVAL_MS
    },
  })
}

export function useJobList(params: JobListParams = {}) {
  return useInfiniteQuery({
    queryKey: ["jobs", params],
    queryFn: ({ pageParam }) =>
      listJobs({ ...params, cursor: pageParam ?? undefined }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchInterval: (query) => {
      const pages = query.state.data?.pages
      const hasActive = pages?.some((page) =>
        page.data.some((job) => !isTerminalJobStatus(job.status))
      )
      return hasActive ? JOB_POLL_INTERVAL_MS : false
    },
  })
}

/** Non-terminal jobs for the overview and the shell watcher. */
export function useActiveJobs() {
  return useQuery({
    queryKey: ["jobs", "active"],
    queryFn: async () => {
      const page = await listJobs({ limit: 20 })
      return page.data.filter((job) => !isTerminalJobStatus(job.status))
    },
    refetchInterval: (query) => {
      const jobs = query.state.data
      return jobs === undefined || jobs.length > 0
        ? JOB_POLL_INTERVAL_MS
        : 30_000
    },
  })
}

export function useEstimate() {
  return useMutation({
    mutationFn: (request: EstimateRequest) => createEstimate(request),
  })
}

/**
 * Newest job id of one kind, used as the fallback "latest result" on studio
 * pages when nothing was submitted in this session yet.
 */
export function useLatestJobId(kind: JobKind, enabled: boolean) {
  return useQuery({
    queryKey: ["jobs", "latest", kind],
    queryFn: async () =>
      (await listJobs({ kind, limit: 1 })).data[0]?.id ?? null,
    enabled,
  })
}

export function useCreateJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateJobPayload) => createJob(payload),
    onSuccess: (job: Job) => {
      queryClient.setQueryData(["job", job.id], job)
      void queryClient.invalidateQueries({ queryKey: ["jobs"] })
      void queryClient.invalidateQueries({ queryKey: ["usage"] })
    },
  })
}

export function useCancelJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => cancelJob(id),
    onSuccess: (job: Job) => {
      queryClient.setQueryData(["job", job.id], job)
      void queryClient.invalidateQueries({ queryKey: ["jobs"] })
      void queryClient.invalidateQueries({ queryKey: ["usage"] })
    },
  })
}
