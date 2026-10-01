import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createProject,
  getProject,
  listProjects,
  patchProject,
} from "@/lib/api/endpoints"

export function useProjects(archived = false) {
  return useQuery({
    queryKey: ["projects", archived],
    queryFn: async () => (await listProjects(archived)).data,
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => getProject(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; description?: string }) =>
      createProject(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string
      patch: { name?: string; description?: string; archived?: boolean }
    }) => patchProject(id, patch),
    onSuccess: (project) => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] })
      void queryClient.invalidateQueries({ queryKey: ["project", project.id] })
    },
  })
}
