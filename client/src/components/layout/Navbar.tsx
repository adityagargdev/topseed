import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trophy, LogOut, User, Settings, Menu, X } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import NotificationBell from '../notifications/NotificationBell'

export default function Navbar() {
  const { user, clear } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const close = () => setMobileOpen(false)

  const handleSignOut = async () => {
    close()
    await signOut(auth)
    clear()
    navigate('/')
  }

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  return (
    <header className="bg-slate-900 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" onClick={close} className="flex items-center gap-2 font-bold text-xl text-white">
          <Trophy className="h-6 w-6 text-primary-400" />
          <span>Top<span className="text-primary-400">Seed</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
          <Link to="/tournaments" className="hover:text-white transition-colors">Tournaments</Link>
          {isAdmin && (
            <Link to="/admin" className="hover:text-white transition-colors">Admin</Link>
          )}
        </nav>

        <div className="flex items-center gap-1">
          {user ? (
            <>
              <NotificationBell />
              <Link to="/profile" onClick={close} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
                {user.photoURL
                  ? <img src={user.photoURL} alt="" className="h-7 w-7 rounded-full object-cover" />
                  : <User className="h-5 w-5 text-gray-400" />
                }
              </Link>
              {user.role === 'SUPER_ADMIN' && (
                <Link to="/admin" className="hidden md:block p-2 rounded-lg hover:bg-slate-800 transition-colors">
                  <Settings className="h-5 w-5 text-gray-400" />
                </Link>
              )}
              <button onClick={handleSignOut} className="hidden md:block p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <LogOut className="h-5 w-5 text-gray-400" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={close}
              className="hidden md:inline-flex px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-500 transition-colors"
            >
              Sign In
            </Link>
          )}

          {/* Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors"
            onClick={() => setMobileOpen(p => !p)}
            aria-label="Toggle menu"
          >
            {mobileOpen
              ? <X className="h-5 w-5 text-gray-400" />
              : <Menu className="h-5 w-5 text-gray-400" />
            }
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-1">
          <MobileLink to="/tournaments" onClick={close}>Tournaments</MobileLink>
          {isAdmin && <MobileLink to="/admin" onClick={close}>Admin</MobileLink>}
          {user ? (
            <>
              <MobileLink to="/profile" onClick={close}>Profile</MobileLink>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <MobileLink to="/login" onClick={close}>Sign In</MobileLink>
          )}
        </div>
      )}
    </header>
  )
}

function MobileLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
    >
      {children}
    </Link>
  )
}
