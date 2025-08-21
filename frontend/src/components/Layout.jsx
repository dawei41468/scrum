import React from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ListTodo, Flag, LogOut, Layers } from 'lucide-react'
import { getRole } from '../utils/auth'

const Layout = () => {
  const navigate = useNavigate()
  const isActive = ({ isActive }) => isActive ? 'text-blue-600 font-semibold' : 'text-gray-700 hover:text-blue-600'

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Page content (add bottom padding so it's not hidden behind bottom nav) */}
      <main
        className="mx-auto max-w-6xl px-4 pt-4 pb-24"
        style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Top utility bar with role badge */}
        <div className="mb-3 flex items-center justify-end">
          {getRole() && (
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
              Role: <span className="ml-1 capitalize">{getRole()}</span>
            </span>
          )}
        </div>
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 inset-x-0 z-10 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Primary"
      >
        <div className="mx-auto max-w-6xl px-2">
          <ul className="grid grid-cols-4 text-sm">
            <li>
              <NavLink
                to="/backlog"
                className={({ isActive }) => [
                  'group flex flex-col items-center justify-center gap-0 py-2.5 px-4 h-16 transition-colors',
                  isActive ? 'text-blue-700 font-medium bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                ].join(' ')}
              >
                <ListTodo aria-hidden className="block h-5 w-5" />
                <span>Backlog</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/epics"
                className={({ isActive }) => [
                  'group flex flex-col items-center justify-center gap-0 py-2.5 px-4 h-16 transition-colors',
                  isActive ? 'text-blue-700 font-medium bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                ].join(' ')}
              >
                <Layers aria-hidden className="block h-5 w-5" />
                <span>Epics</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/sprints"
                className={({ isActive }) => [
                  'group flex flex-col items-center justify-center gap-0 py-2.5 px-4 h-16 transition-colors',
                  isActive ? 'text-blue-700 font-medium bg-blue-50' : 'text-gray-700 hover:text-blue-600'
                ].join(' ')}
              >
                <Flag aria-hidden className="block h-5 w-5" />
                <span>Sprints</span>
              </NavLink>
            </li>
            <li>
              <button
                onClick={handleLogout}
                className="group flex flex-col items-center justify-center gap-0 py-2.5 px-4 h-16 text-gray-700 hover:text-red-600 w-full"
                aria-label="Logout"
              >
                <LogOut aria-hidden className="block h-5 w-5" />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  )
}

export default Layout
