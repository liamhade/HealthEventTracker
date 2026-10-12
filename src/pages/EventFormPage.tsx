import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { addHours } from 'date-fns'
import { useEvent, useSaveEvent } from '../hooks/queries'
import { ImagePicker } from '../components/ImagePicker'
import { TagPicker } from '../components/TagPicker'
import { Button, CenteredSpinner, ErrorNote, ScreenHeader, Spinner } from '../components/ui'
import { fromLocalInputValue, toLocalInputValue } from '../lib/format'
import type { HealthEvent, ImageDraft } from '../lib/api'

export function NewEventPage() {
  const [params] = useSearchParams()
  const start = params.get('start')
  return <EventForm startValue={start && !isNaN(Date.parse(start)) ? start : undefined} />
}

export function EditEventPage() {
  const { id } = useParams()
  const { data: event, isLoading } = useEvent(id)
  if (isLoading) return <CenteredSpinner />
  if (!event) return <NotFound />
  return <EventForm key={event.id} existing={event} />
}

function NotFound() {
  return (
    <>
      <ScreenHeader title="Not found" />
      <p className="p-8 text-center text-muted">This event doesn't exist or was deleted.</p>
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[13px] font-semibold tracking-wide text-muted uppercase">{label}</h2>
      {children}
    </section>
  )
}

const inputClass =
  'w-full min-h-11 rounded-xl border border-border bg-bg px-3 outline-none focus:border-accent-strong'

function EventForm({ existing, startValue }: { existing?: HealthEvent; startValue?: string }) {
  const navigate = useNavigate()
  const save = useSaveEvent()

  const [title, setTitle] = useState(existing?.title ?? '')
  const [description, setDescription] = useState(existing?.description_text ?? '')
  const [start, setStart] = useState(() =>
    existing ? toLocalInputValue(new Date(existing.start_time)) : (startValue ?? toLocalInputValue(new Date())),
  )
  const [isSpan, setIsSpan] = useState(existing ? existing.end_time !== null : false)
  const [end, setEnd] = useState(() =>
    existing?.end_time
      ? toLocalInputValue(new Date(existing.end_time))
      : toLocalInputValue(addHours(fromLocalInputValue(start), 1)),
  )
  const [tagIds, setTagIds] = useState<string[]>(existing?.tags.map((t) => t.id) ?? [])
  const [images, setImages] = useState<ImageDraft[]>(
    existing?.event_images.map((i) => ({ kind: 'existing', id: i.id, storage_path: i.storage_path })) ?? [],
  )
  const [validation, setValidation] = useState<string | null>(null)

  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault()
    setValidation(null)
    if (!title.trim()) return setValidation('Give the event a title.')
    if (!start) return setValidation('Pick a start time.')
    const startDate = fromLocalInputValue(start)
    const endDate = isSpan && end ? fromLocalInputValue(end) : null
    if (isSpan && !endDate) return setValidation('Pick an end time, or turn off "Has end time".')
    if (endDate && endDate < startDate) return setValidation('The end time must be after the start time.')

    let id: string
    try {
      id = await save.mutateAsync({
        existing,
        input: {
          title,
          description_text: description,
          start_time: startDate.toISOString(),
          end_time: endDate?.toISOString() ?? null,
          tagIds,
          images,
        },
      })
    } catch {
      return // shown via save.error
    }
    images.forEach((img) => img.kind === 'new' && URL.revokeObjectURL(img.previewUrl))
    navigate(`/events/${id}`, { replace: true })
  }

  return (
    <div className="min-h-dvh">
      <ScreenHeader
        title={existing ? 'Edit event' : 'New event'}
        right={
          <Button onClick={() => onSubmit()} disabled={save.isPending} className="min-h-9 px-4">
            {save.isPending ? <Spinner /> : 'Save'}
          </Button>
        }
      />
      <form onSubmit={onSubmit} noValidate className="pb-safe mx-auto max-w-2xl space-y-6 px-4 pt-4 pb-12">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What happened?"
          maxLength={200}
          autoFocus={!existing}
          enterKeyHint="done"
          className="w-full bg-transparent text-[24px] font-semibold outline-none placeholder:text-muted/60"
        />

        <Field label="When">
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-3">
            <label className="flex items-center gap-3">
              <span className="w-12 text-[15px] text-muted">{isSpan ? 'Start' : 'At'}</span>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={inputClass}
                required
              />
              <button
                type="button"
                onClick={() => setStart(toLocalInputValue(new Date()))}
                className="shrink-0 rounded-lg px-2 py-2 text-[14px] font-medium text-accent-strong"
              >
                Now
              </button>
            </label>
            {isSpan && (
              <label className="flex items-center gap-3">
                <span className="w-12 text-[15px] text-muted">End</span>
                <input
                  type="datetime-local"
                  value={end}
                  min={start}
                  onChange={(e) => setEnd(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setEnd(toLocalInputValue(new Date()))}
                  className="shrink-0 rounded-lg px-2 py-2 text-[14px] font-medium text-accent-strong"
                >
                  Now
                </button>
              </label>
            )}
            <label className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-[15px]">Has end time</span>
              <Toggle
                checked={isSpan}
                onChange={(checked) => {
                  setIsSpan(checked)
                  if (checked && (!end || fromLocalInputValue(end) < fromLocalInputValue(start))) {
                    setEnd(toLocalInputValue(addHours(fromLocalInputValue(start), 1)))
                  }
                }}
              />
            </label>
          </div>
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes, symptoms, details…"
            rows={4}
            className="w-full resize-y rounded-xl border border-border bg-bg p-3 outline-none focus:border-accent-strong"
          />
          <ImagePicker value={images} onChange={setImages} />
        </Field>

        <Field label="Tags">
          <TagPicker value={tagIds} onChange={setTagIds} />
        </Field>

        {validation && <p className="text-sm text-danger">{validation}</p>}
        <ErrorNote error={save.error} />

        <Button type="submit" disabled={save.isPending} className="w-full">
          {save.isPending ? <Spinner /> : existing ? 'Save changes' : 'Log event'}
        </Button>
      </form>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-accent-strong' : 'bg-surface-2'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}
