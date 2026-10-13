import type { PluginBase } from '@schedule-x/calendar'
import type { Temporal } from 'temporal-polyfill'

// A horizontal swipe has to travel this far, stay this horizontal, and finish this fast to count.
const MIN_DISTANCE_PX = 50
const MIN_HORIZONTAL_RATIO = 1.5
const MAX_DURATION_MS = 600

// The slice of Schedule-X's internal app this plugin uses. It isn't exported, so it is typed here.
interface SwipeApp {
  config: {
    views: {
      value: {
        name: string
        backwardForwardFn: (date: Temporal.PlainDate, units: number) => Temporal.PlainDate
        backwardForwardUnits: number
      }[]
    }
  }
  calendarState: { view: { value: string } }
  datePickerState: { selectedDate: { value: Temporal.PlainDate } }
}

/**
 * Swipe left/right to move forward/back one period of whatever view is showing (a day, a week, a month).
 * Schedule-X has no public navigation API, so this steps the selected date the same way its header chevrons do.
 */
export function createSwipeNavigationPlugin() {
  let app: SwipeApp | undefined
  let start: { x: number; y: number; time: number } | undefined

  const step = (direction: 1 | -1) => {
    if (!app) return
    const view = app.config.views.value.find((v) => v.name === app!.calendarState.view.value)
    if (!view) return
    const selected = app.datePickerState.selectedDate
    selected.value = view.backwardForwardFn(selected.value, direction * view.backwardForwardUnits)
  }

  const onTouchStart = (e: TouchEvent) => {
    const target = e.target as Element | null
    // Leave the header (view picker, date picker) to its own gestures.
    if (e.touches.length !== 1 || target?.closest('.sx__calendar-header, .sx__date-picker-popup')) {
      start = undefined
      return
    }
    const touch = e.touches[0]
    start = { x: touch.clientX, y: touch.clientY, time: e.timeStamp }
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (!start) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    const elapsed = e.timeStamp - start.time
    start = undefined
    if (Math.abs(dx) < MIN_DISTANCE_PX || Math.abs(dx) < Math.abs(dy) * MIN_HORIZONTAL_RATIO) return
    if (elapsed > MAX_DURATION_MS) return
    // Finger moving left reveals what comes next.
    step(dx < 0 ? 1 : -1)
  }

  const onTouchCancel = () => {
    start = undefined
  }

  return {
    name: 'swipeNavigation',
    onRender($app: SwipeApp) {
      app = $app
    },
    /** Attach to the element wrapping the calendar; returns a cleanup function. */
    attach(el: HTMLElement) {
      el.addEventListener('touchstart', onTouchStart, { passive: true })
      el.addEventListener('touchend', onTouchEnd, { passive: true })
      el.addEventListener('touchcancel', onTouchCancel, { passive: true })
      return () => {
        el.removeEventListener('touchstart', onTouchStart)
        el.removeEventListener('touchend', onTouchEnd)
        el.removeEventListener('touchcancel', onTouchCancel)
      }
    },
  } satisfies PluginBase<'swipeNavigation'> & { attach: (el: HTMLElement) => () => void }
}
