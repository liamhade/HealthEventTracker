import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Temporal } from 'temporal-polyfill'
import { ScheduleXCalendar, useCalendarApp } from '@schedule-x/react'
import {
  createViewDay,
  createViewMonthAgenda,
  createViewMonthGrid,
  createViewWeek,
  type CalendarEventExternal,
} from '@schedule-x/calendar'
import { createScrollControllerPlugin } from '@schedule-x/scroll-controller'
import { format, subHours } from 'date-fns'
import '@schedule-x/theme-default/dist/index.css'
import { useEvents } from '../hooks/queries'
import { useTheme } from '../hooks/theme'
import { TagFilter } from '../components/TagFilter'
import { filterByTags } from '../lib/filters'
import { ErrorNote } from '../components/ui'
import { toLocalInputValue } from '../lib/format'
import { createSwipeNavigationPlugin } from '../lib/calendarSwipe'
import type { HealthEvent } from '../lib/api'

// Point-in-time events have no duration; give them a sliver of height so they're tappable.
const POINT_EVENT_DISPLAY_MINUTES = 30

const timeZone = Temporal.Now.timeZoneId()

const toZoned = (iso: string) => Temporal.Instant.from(iso).toZonedDateTimeISO(timeZone)

function toCalendarEvent(event: HealthEvent): CalendarEventExternal {
  const start = toZoned(event.start_time)
  const end = event.end_time ? toZoned(event.end_time) : start.add({ minutes: POINT_EVENT_DISPLAY_MINUTES })
  return {
    id: event.id,
    title: event.end_time ? event.title : `• ${event.title}`,
    start,
    end,
    description: event.description_text ?? undefined,
    calendarId: event.end_time ? 'span' : 'point',
  }
}

export function CalendarPage() {
  const navigate = useNavigate()
  // Schedule-X captures callbacks once at creation, so route through a ref.
  const navigateRef = useRef(navigate)
  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])

  const { data: events, error } = useEvents()
  const { resolved } = useTheme()
  const [tagFilter, setTagFilter] = useState<string[]>([])

  const calendarEvents = useMemo(
    () => filterByTags(events ?? [], tagFilter).map(toCalendarEvent),
    [events, tagFilter],
  )

  // Open the time grid an hour before now instead of at midnight.
  const [scrollController] = useState(() =>
    createScrollControllerPlugin({ initialScroll: format(subHours(new Date(), 1), 'HH:00') }),
  )

  const [swipeNavigation] = useState(createSwipeNavigationPlugin)
  const calendarWrapperRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (calendarWrapperRef.current) return swipeNavigation.attach(calendarWrapperRef.current)
  }, [swipeNavigation])

  const calendar = useCalendarApp({
    views: [createViewDay(), createViewWeek(), createViewMonthGrid(), createViewMonthAgenda()],
    defaultView: window.innerWidth < 700 ? 'day' : 'week',
    timezone: timeZone,
    isDark: resolved === 'dark',
    events: calendarEvents,
    dayBoundaries: { start: '00:00', end: '24:00' },
    weekOptions: { gridHeight: 1400 },
    calendars: {
      span: {
        colorName: 'span',
        lightColors: { main: '#1479bd', container: '#a7d8f8', onContainer: '#062a44' },
        darkColors: { main: '#4cbf78', container: '#14532d', onContainer: '#d6f5df' },
      },
      point: {
        colorName: 'point',
        lightColors: { main: '#1479bd', container: '#e7f2fc', onContainer: '#0b1a2a' },
        darkColors: { main: '#4cbf78', container: '#111a13', onContainer: '#e8f1ea' },
      },
    },
    plugins: [scrollController, swipeNavigation],
    callbacks: {
      onEventClick: (event) => navigateRef.current(`/events/${event.id}`),
      onClickDateTime: (dateTime) => {
        const local = new Date(dateTime.toInstant().epochMilliseconds)
        navigateRef.current(`/events/new?start=${encodeURIComponent(toLocalInputValue(local))}`)
      },
    },
  })

  useEffect(() => {
    calendar?.events.set(calendarEvents)
  }, [calendar, calendarEvents])

  useEffect(() => {
    calendar?.setTheme(resolved)
  }, [calendar, resolved])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-5xl">
        <TagFilter value={tagFilter} onChange={setTagFilter} />
        {error && (
          <div className="px-4 pb-2">
            <ErrorNote error={error} />
          </div>
        )}
      </div>
      <div ref={calendarWrapperRef} className="app-calendar mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-hidden">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
    </div>
  )
}
