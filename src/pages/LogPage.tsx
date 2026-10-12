import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { useEvents } from '../hooks/queries'
import { formatEventTime } from '../lib/format'

export function LogPage() {
  const { data: events } = useEvents()
  const last = events?.[0]

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-10">
      <p className="text-[15px] font-medium text-muted">{format(new Date(), 'EEEE, MMMM d')}</p>

      <Link
        to="/events/new"
        className="group relative flex size-52 items-center justify-center rounded-full bg-accent text-on-accent shadow-soft transition active:scale-95"
      >
        <span className="absolute inset-0 rounded-full bg-accent opacity-40 blur-2xl transition group-active:opacity-60" />
        <span className="relative text-[34px] font-semibold tracking-tight">Log</span>
      </Link>

      <div className="h-12 text-center">
        {last && (
          <Link to={`/events/${last.id}`} className="block text-[13px] text-muted">
            <span className="block">Last logged</span>
            <span className="font-medium text-fg">{last.title}</span>
            <span> · {format(new Date(last.start_time), 'MMM d')}, {formatEventTime(last.start_time, null)}</span>
          </Link>
        )}
      </div>
    </div>
  )
}
