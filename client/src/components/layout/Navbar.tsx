import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, User, Settings, Menu, X, Sun, Moon } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import NotificationBell from '../notifications/NotificationBell'
import { cn } from '../../lib/utils'

export default function Navbar() {
  const { user, clear } = useAuthStore()
  const { dark, toggle } = useThemeStore()
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
    <header
      className="sticky top-0 z-40 glass border-b border-tok"
      style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link to="/" onClick={close} className="flex items-center gap-2 shrink-0">
          <span className="font-display font-extrabold text-base tracking-tight text-tok">
            Top<span className="gradient-text">Seed</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-5 flex-1">
          <NavLink to="/tournaments" onClick={close}>Tournaments</NavLink>
          {isAdmin && <NavLink to="/admin" onClick={close}>Admin</NavLink>}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="p-2 rounded-full text-tok-muted hover:text-tok hover:bg-tok-surface transition-colors"
            aria-label="Toggle dark mode"
          >
            {dark
              ? <Sun  className="h-4 w-4" />
              : <Moon className="h-4 w-4" />
            }
          </button>

          {user ? (
            <>
              <NotificationBell />
              <Link
                to="/profile"
                onClick={close}
                className="p-1.5 rounded-full text-tok-muted hover:text-tok transition-colors"
              >
                {user.photoURL
                  ? <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full object-cover ring-2 ring-tok" />
                  : <User className="h-4 w-4" />
                }
              </Link>
              {user.role === 'SUPER_ADMIN' && (
                <Link
                  to="/admin"
                  className="hidden md:block p-2 rounded-full text-tok-muted hover:text-tok transition-colors"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="hidden md:block p-2 rounded-full text-tok-muted hover:text-tok transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={close}
              className="hidden md:inline-flex btn-primary text-xs py-2 px-4"
            >
              Sign In
            </Link>
          )}

          <button
            className="md:hidden p-2 rounded-full text-tok-muted hover:text-tok transition-colors"
            onClick={() => setMobileOpen(p => !p)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-tok bg-tok-bg px-4 py-3 space-y-1">
          <MobileLink to="/tournaments" onClick={close}>Tournaments</MobileLink>
          {isAdmin && <MobileLink to="/admin" onClick={close}>Admin</MobileLink>}
          {user ? (
            <>
              <MobileLink to="/profile" onClick={close}>Profile</MobileLink>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2.5 mono-label text-tok-muted hover:text-tok transition-colors"
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

function NavLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="mono-label text-tok-muted hover:text-tok transition-colors"
    >
      {children}
    </Link>
  )
}

function MobileLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn('block px-3 py-2.5 mono-label text-tok-muted hover:text-tok transition-colors')}
    >
      {children}
    </Link>
  )
}
