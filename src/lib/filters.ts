import type { HealthEvent } from './api'

/** Events having any of the given tags; an empty selection keeps everything. */
export function filterByTags(events: HealthEvent[], tagIds: string[]): HealthEvent[] {
  if (!tagIds.length) return events
  return events.filter((e) => e.tags.some((t) => tagIds.includes(t.id)))
}
