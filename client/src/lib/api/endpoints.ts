import { api } from "@/lib/api/client"
import type { AssetSource } from "@/lib/api/studio-types"
import type {
  Asset,
  BudgetConfig,
  Capability,
  ConnectionInfo,
  Estimate,
  Job,
  JobInput,
  JobKind,
  LedgerEntry,
  ListResponse,
  Project,
  ProjectDetail,
  SessionInfo,
  Usage,
} from "@/lib/api/types"

function query(
  params: Record<string, string | number | boolean | undefined>
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ""
}

// Session
export const getSession = (): Promise<SessionInfo> => api.refreshSession()
export const login = (password: string): Promise<SessionInfo> =>
  api.request<SessionInfo>("/session", { method: "POST", body: { password } })
export const logout = (): Promise<{ authenticated: boolean }> =>
  api.request("/session", { method: "DELETE" })

// Capabilities / connection / budget
export const getCapabilities = (): Promise<Capability[]> =>
  api.request("/capabilities")
export const getConnection = (): Promise<ConnectionInfo> =>
  api.request("/connection")
export const getBudget = (): Promise<BudgetConfig> => api.request("/budget")
export const patchBudget = (
  patch: Partial<BudgetConfig>
): Promise<BudgetConfig> =>
  api.request("/budget", { method: "PATCH", body: patch })

// Estimates and jobs
export interface EstimateRequest {
  kind: JobKind
  input: JobInput
}

export const createEstimate = (payload: EstimateRequest): Promise<Estimate> =>
  api.request("/estimates", { method: "POST", body: payload })

export interface CreateJobPayload {
  kind: JobKind
  idempotencyKey: string
  input: JobInput
  projectId?: string
}

export const createJob = (payload: CreateJobPayload): Promise<Job> =>
  api.request("/jobs", { method: "POST", body: payload })

export interface JobListParams {
  status?: string
  kind?: JobKind
  cursor?: string
  limit?: number
}

export const listJobs = (
  params: JobListParams = {}
): Promise<ListResponse<Job>> =>
  api.requestList<Job>(`/jobs${query({ ...params })}`)

export const getJob = (id: string): Promise<Job> => api.request(`/jobs/${id}`)
export const cancelJob = (id: string): Promise<Job> =>
  api.request(`/jobs/${id}/cancel`, { method: "POST" })

// Assets
export interface AssetListParams {
  q?: string
  favorite?: boolean
  projectId?: string
  archived?: boolean
  source?: AssetSource
  sort?: "createdAt" | "title" | "duration"
  order?: "asc" | "desc"
  cursor?: string
  limit?: number
}

export const listAssets = (
  params: AssetListParams = {}
): Promise<ListResponse<Asset>> =>
  api.requestList<Asset>(`/assets${query({ ...params })}`)

export const getAsset = (id: string): Promise<Asset> =>
  api.request(`/assets/${id}`)

export interface AssetPatch {
  title?: string
  favorite?: boolean
  archived?: boolean
  projectId?: string | null
}

export const patchAsset = (id: string, patch: AssetPatch): Promise<Asset> =>
  api.request(`/assets/${id}`, { method: "PATCH", body: patch })

// Projects
export const listProjects = (
  archived = false
): Promise<ListResponse<Project>> =>
  api.requestList<Project>(`/projects${query({ archived })}`)

export const createProject = (payload: {
  name: string
  description?: string
}): Promise<Project> =>
  api.request("/projects", { method: "POST", body: payload })

export const getProject = (id: string): Promise<ProjectDetail> =>
  api.request(`/projects/${id}`)

export const patchProject = (
  id: string,
  patch: { name?: string; description?: string; archived?: boolean }
): Promise<Project> =>
  api.request(`/projects/${id}`, { method: "PATCH", body: patch })

// Usage
export const getUsage = (): Promise<Usage> => api.request("/usage")

export const listLedger = (
  params: {
    cursor?: string
    limit?: number
  } = {}
): Promise<ListResponse<LedgerEntry>> =>
  api.requestList<LedgerEntry>(`/usage/ledger${query({ ...params })}`)

export const createReconciliation = (payload: {
  credits: number
  reason: string
  source: string
}): Promise<LedgerEntry> =>
  api.request("/usage/reconciliations", { method: "POST", body: payload })
