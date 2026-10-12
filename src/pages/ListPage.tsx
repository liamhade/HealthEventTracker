import { useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Link } from 'react-router-dom'
import { useEvents } from '../hooks/queries'
import { EventCard } from '../components/EventCard'
import { TagFilter } from '../components/TagFilter'
import { filterByTags } from '../lib/filters'
import { ArrowsIcon } from '../components/icons'
import { CenteredSpinner, ErrorNote } from '../components/ui'
import { formatDayHeading } from '../lib/format'
import type { HealthEvent } from '../lib/api'

type Order = 'newest' | 'oldest'

export function ListPage() {
  const { data: events, isLoading, error } = useEvents()
  const [tagFilter, setTagFilter] = useState<string[]>([])
  const [order, setOrder] = useState<Order>('newest')

  const groups = useMemo(() => {
    const filtered = filterByTags(events ?? [], tagFilter)
    // fetchEvents returns newest first
    const sorted = order === 'newest' ? filtered : [...filtered].reverse()
    const byDay = new Map<string, HealthEvent[]>()
    for (const e of sorted) {
      const key = format(parseISO(e.start_time), 'yyyy-MM-dd')
      const list = byDay.get(key)
      if (list) list.push(e)
      else byDay.set(key, [e])
    }
    return [...byDay.entries()]
  }, [events, tagFilter, order])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-2xl items-start">
        <div className="min-w-0 flex-1">
          <TagFilter value={tagFilter} onChange={setTagFilter} />
        </div>
        <button
          type="button"
          onClick={() => setOrder(order === 'newest' ? 'oldest' : 'newest')}
          className="mr-3 flex h-8 shrink-0 items-center gap-1 rounded-full px-2 text-[13px] font-medium text-accent-strong"
        >
          <ArrowsIcon width={16} height={16} />
          {order === 'newest' ? 'Newest' : 'Oldest'}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-4 pb-8">
          {isLoading && <CenteredSpinner />}
          <ErrorNote error={error} />
          {!isLoading && !groups.length && (
            <div className="py-20 text-center text-muted">
              <p>{tagFilter.length ? 'No events with these tags.' : 'Nothing logged yet.'}</p>
              {!tagFilter.length && (
                <Link to="/events/new" className="mt-3 inline-block font-medium text-accent-strong">
                  Log your first event
                </Link>
              )}
            </div>
          )}
          {groups.map(([day, dayEvents]) => (
            <section key={day}>
              <h2 className="sticky top-0 z-10 bg-bg/95 py-2 text-[13px] font-semibold tracking-wide text-muted uppercase backdrop-blur">
                {formatDayHeading(parseISO(day))}
              </h2>
              <div className="space-y-2 pb-4">
                {dayEvents.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
