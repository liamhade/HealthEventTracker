import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTag,
  deleteEvent,
  deleteTag,
  fetchEvents,
  fetchSignedUrls,
  fetchTags,
  renameTag,
  saveEvent,
  type EventInput,
  type HealthEvent,
} from '../lib/api'
import { useUser } from './auth'

export const queryKeys = {
  events: ['events'] as const,
  tags: ['tags'] as const,
  signedUrls: (paths: string[]) => ['signed-urls', ...paths] as const,
}

export function useEvents() {
  return useQuery({ queryKey: queryKeys.events, queryFn: fetchEvents })
}

/** Reads one event out of the shared events list so detail/edit screens stay in sync with it. */
export function useEvent(id: string | undefined) {
  const query = useEvents()
  return { ...query, data: query.data?.find((e) => e.id === id) }
}

export function useTags() {
  return useQuery({ queryKey: queryKeys.tags, queryFn: fetchTags })
}

export function useSignedUrls(paths: string[]) {
  return useQuery({
    queryKey: queryKeys.signedUrls(paths),
    queryFn: () => fetchSignedUrls(paths),
    enabled: paths.length > 0,
    // Signed URLs live for an hour; refresh well before they expire.
    staleTime: 45 * 60 * 1000,
    gcTime: 50 * 60 * 1000,
  })
}

export function useSaveEvent() {
  const user = useUser()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ input, existing }: { input: EventInput; existing?: HealthEvent }) =>
      saveEvent(user.id, input, existing),
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.events }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteEvent,
    onSuccess: (_data, event) => {
      qc.setQueryData<HealthEvent[]>(queryKeys.events, (old) => old?.filter((e) => e.id !== event.id))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.events }),
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTag,
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.tags }),
  })
}

export function useRenameTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameTag(id, name),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags })
      qc.invalidateQueries({ queryKey: queryKeys.events })
    },
  })
}

export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteTag,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tags })
      qc.invalidateQueries({ queryKey: queryKeys.events })
    },
  })
}
