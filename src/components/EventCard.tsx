import { Link } from 'react-router-dom'
import type { HealthEvent } from '../lib/api'
import { formatEventTime } from '../lib/format'
import { EventImages } from './EventImages'
import { TagChip } from './ui'

export function EventCard({ event }: { event: HealthEvent }) {
  const isSpan = event.end_time !== null
  return (
    <Link
      to={`/events/${event.id}`}
      className="block rounded-2xl border border-border bg-surface px-4 py-4 transition active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 shrink-0 ${isSpan ? 'h-4 w-1.5 rounded-full' : 'size-2.5 rounded-full'} bg-accent-strong`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div>
            <h3 className="truncate text-[16px] font-semibold">{event.title}</h3>
            <p className="mt-0.5 text-[13px] text-muted">{formatEventTime(event.start_time, event.end_time)}</p>
          </div>
          {event.description_text && (
            <p className="line-clamp-2 text-[14px] whitespace-pre-line text-fg/80">{event.description_text}</p>
          )}
          <EventImages images={event.event_images} size="sm" />
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {event.tags.map((t) => (
                <TagChip key={t.id} name={t.name} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
