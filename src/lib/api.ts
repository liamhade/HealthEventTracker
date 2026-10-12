import { supabase, IMAGE_BUCKET } from './supabase'
import type { Tables } from './database.types'
import type { PreparedImage } from './images'

export type Tag = Pick<Tables<'tags'>, 'id' | 'name'>
export type EventImage = Pick<Tables<'event_images'>, 'id' | 'storage_path' | 'position'>
export type HealthEvent = Tables<'events'> & {
  tags: Tag[]
  event_images: EventImage[]
}

export type ImageDraft =
  | { kind: 'existing'; id: string; storage_path: string }
  | { kind: 'new'; key: string; prepared: PreparedImage; previewUrl: string }

export type EventInput = {
  title: string
  description_text: string | null
  start_time: string
  end_time: string | null
  tagIds: string[]
  images: ImageDraft[]
}

const EVENT_SELECT = '*, tags(id, name), event_images(id, storage_path, position)'
const PAGE_SIZE = 1000

function sortRelations(event: HealthEvent): HealthEvent {
  event.event_images.sort((a, b) => a.position - b.position)
  event.tags.sort((a, b) => a.name.localeCompare(b.name))
  return event
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function fetchEvents(): Promise<HealthEvent[]> {
  const all: HealthEvent[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('events')
      .select(EVENT_SELECT)
      .order('start_time', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    all.push(...(data as HealthEvent[]))
    if (data.length < PAGE_SIZE) break
  }
  return all.map(sortRelations)
}

export async function fetchEvent(id: string): Promise<HealthEvent | null> {
  const { data, error } = await supabase.from('events').select(EVENT_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data ? sortRelations(data as HealthEvent) : null
}

async function uploadImage(userId: string, eventId: string, image: PreparedImage): Promise<string> {
  const path = `${userId}/${eventId}/${crypto.randomUUID()}.${image.extension}`
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, image.blob, { contentType: image.mimeType, upsert: false })
  if (error) throw error
  return path
}

async function syncImages(userId: string, eventId: string, drafts: ImageDraft[], previous: EventImage[]) {
  const keptIds = new Set(drafts.filter((d) => d.kind === 'existing').map((d) => d.id))
  const removed = previous.filter((img) => !keptIds.has(img.id))

  if (removed.length) {
    const { error } = await supabase.from('event_images').delete().in('id', removed.map((r) => r.id))
    if (error) throw error
    // Best effort: an orphaned file is harmless, so don't fail the save over it.
    await supabase.storage.from(IMAGE_BUCKET).remove(removed.map((r) => r.storage_path))
  }

  const uploads = await Promise.all(
    drafts.map(async (draft, position) =>
      draft.kind === 'new'
        ? { position, storage_path: await uploadImage(userId, eventId, draft.prepared) }
        : null,
    ),
  )
  const inserts = uploads.filter((u) => u !== null).map((u) => ({ ...u, event_id: eventId }))
  if (inserts.length) {
    const { error } = await supabase.from('event_images').insert(inserts)
    if (error) throw error
  }

  // Keep positions in the order the user arranged them.
  const reorders = drafts.flatMap((draft, position) => {
    if (draft.kind !== 'existing') return []
    const before = previous.find((p) => p.id === draft.id)
    return before && before.position !== position ? [{ id: draft.id, position }] : []
  })
  for (const { id, position } of reorders) {
    const { error } = await supabase.from('event_images').update({ position }).eq('id', id)
    if (error) throw error
  }
}

async function syncTags(eventId: string, tagIds: string[], previous: Tag[]) {
  const prevIds = new Set(previous.map((t) => t.id))
  const nextIds = new Set(tagIds)
  const toRemove = [...prevIds].filter((id) => !nextIds.has(id))
  const toAdd = [...nextIds].filter((id) => !prevIds.has(id))

  if (toRemove.length) {
    const { error } = await supabase.from('event_tags').delete().eq('event_id', eventId).in('tag_id', toRemove)
    if (error) throw error
  }
  if (toAdd.length) {
    const { error } = await supabase.from('event_tags').insert(toAdd.map((tag_id) => ({ event_id: eventId, tag_id })))
    if (error) throw error
  }
}

/** Creates a new event, or updates `existing` in place. Returns the event id. */
export async function saveEvent(userId: string, input: EventInput, existing?: HealthEvent): Promise<string> {
  const fields = {
    title: input.title.trim(),
    description_text: input.description_text?.trim() || null,
    start_time: input.start_time,
    end_time: input.end_time,
  }

  let eventId: string
  if (existing) {
    const { error } = await supabase.from('events').update(fields).eq('id', existing.id)
    if (error) throw error
    eventId = existing.id
  } else {
    const { data, error } = await supabase.from('events').insert(fields).select('id').single()
    if (error) throw error
    eventId = data.id
  }

  await syncImages(userId, eventId, input.images, existing?.event_images ?? [])
  await syncTags(eventId, input.tagIds, existing?.tags ?? [])
  return eventId
}

export async function deleteEvent(event: HealthEvent): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', event.id)
  if (error) throw error
  if (event.event_images.length) {
    await supabase.storage.from(IMAGE_BUCKET).remove(event.event_images.map((i) => i.storage_path))
  }
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

const SIGNED_URL_TTL_SECONDS = 60 * 60

export async function fetchSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {}
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  if (error) throw error
  const urls: Record<string, string> = {}
  for (const item of data) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl
  }
  return urls
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function fetchTags(): Promise<Tag[]> {
  const { data, error } = await supabase.from('tags').select('id, name').order('name')
  if (error) throw error
  return data
}

function friendlyTagError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') return new Error('A tag with that name already exists.')
  return new Error(error.message)
}

export async function createTag(name: string): Promise<Tag> {
  const { data, error } = await supabase.from('tags').insert({ name: name.trim() }).select('id, name').single()
  if (error) throw friendlyTagError(error)
  return data
}

export async function renameTag(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('tags').update({ name: name.trim() }).eq('id', id)
  if (error) throw friendlyTagError(error)
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw error
}
