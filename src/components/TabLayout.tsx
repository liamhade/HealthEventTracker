import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarIcon, ListIcon, LogIcon, SettingsIcon } from './icons'

const tabs = [
  { to: '/', label: 'Log', icon: LogIcon, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon, end: false },
  { to: '/list', label: 'List', icon: ListIcon, end: false },
]

const titles: Record<string, string> = { '/': '', '/calendar': 'Calendar', '/list': 'Events' }

export function TabLayout() {
  const { pathname } = useLocation()
  return (
    <div className="flex h-dvh flex-col">
      <header className="pt-safe shrink-0">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between px-5 py-2">
          <h1 className="text-[24px] font-bold tracking-tight">{titles[pathname] ?? ''}</h1>
          <Link
            to="/settings"
            className="flex size-11 items-center justify-center rounded-full text-muted hover:bg-surface-2"
            aria-label="Settings"
          >
            <SettingsIcon />
          </Link>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>

      <nav className="pb-safe shrink-0 border-t border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto grid min-h-[4.5rem] max-w-md grid-cols-3 py-1.5">
          {tabs.map(({ to, label, icon: TabIcon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 text-[12px] font-medium transition ${
                  isActive ? 'text-accent-strong' : 'text-muted'
                }`
              }
            >
              <TabIcon />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
