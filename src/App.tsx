import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/auth'
import { TabLayout } from './components/TabLayout'
import { CenteredSpinner } from './components/ui'
import { LoginPage } from './pages/LoginPage'
import { LogPage } from './pages/LogPage'
import { ListPage } from './pages/ListPage'
import { EventDetailPage } from './pages/EventDetailPage'
import { EditEventPage, NewEventPage } from './pages/EventFormPage'
import { SettingsPage } from './pages/SettingsPage'
import { SetNewPasswordPage } from './pages/SetNewPasswordPage'

// Schedule-X is the heaviest dependency; only load it when the calendar is opened.
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })))

export default function App() {
  const { session, loading, recovering } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh">
        <CenteredSpinner />
      </div>
    )
  }

  if (!session) return <LoginPage />
  if (recovering) return <SetNewPasswordPage />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<TabLayout />}>
          <Route index element={<LogPage />} />
          <Route
            path="calendar"
            element={
              <Suspense fallback={<CenteredSpinner />}>
                <CalendarPage />
              </Suspense>
            }
          />
          <Route path="list" element={<ListPage />} />
        </Route>
        <Route path="events/new" element={<NewEventPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="events/:id/edit" element={<EditEventPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
