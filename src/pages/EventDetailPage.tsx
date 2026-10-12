import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDeleteEvent, useEvent } from '../hooks/queries'
import { EventImages } from '../components/EventImages'
import { PencilIcon, TrashIcon } from '../components/icons'
import { CenteredSpinner, ErrorNote, ScreenHeader, Spinner, TagChip } from '../components/ui'
import { formatEventDateTime } from '../lib/format'

export function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: event, isLoading, error } = useEvent(id)
  const remove = useDeleteEvent()

  if (isLoading) return <CenteredSpinner />
  if (!event) {
    return (
      <>
        <ScreenHeader title="Not found" />
        <div className="p-8 text-center text-muted">
          <ErrorNote error={error} />
          <p>This event doesn't exist or was deleted.</p>
        </div>
      </>
    )
  }

  const onDelete = () => {
    if (!window.confirm(`Delete "${event.title}"? This can't be undone.`)) return
    remove.mutate(event, { onSuccess: () => navigate('/list', { replace: true }) })
  }

  return (
    <div className="min-h-dvh">
      <ScreenHeader
        right={
          <>
            <Link
              to={`/events/${event.id}/edit`}
              className="flex size-11 items-center justify-center rounded-full text-accent-strong hover:bg-accent-soft"
              aria-label="Edit"
            >
              <PencilIcon />
            </Link>
            <button
              type="button"
              onClick={onDelete}
              disabled={remove.isPending}
              className="flex size-11 items-center justify-center rounded-full text-danger hover:bg-surface-2"
              aria-label="Delete"
            >
              {remove.isPending ? <Spinner /> : <TrashIcon />}
            </button>
          </>
        }
      />
      <article className="pb-safe mx-auto max-w-2xl space-y-5 px-4 pt-4 pb-12">
        <header className="space-y-1">
          <h1 className="text-[26px] leading-tight font-bold">{event.title}</h1>
          <p className="text-[15px] text-muted">{formatEventDateTime(event.start_time, event.end_time)}</p>
          {event.end_time === null && <p className="text-[13px] text-muted">Point in time</p>}
        </header>

        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {event.tags.map((t) => (
              <TagChip key={t.id} name={t.name} selected />
            ))}
          </div>
        )}

        {event.description_text && (
          <p className="text-[16px] leading-relaxed whitespace-pre-line">{event.description_text}</p>
        )}

        <EventImages images={event.event_images} />
        <ErrorNote error={remove.error} />
      </article>
    </div>
  )
}
