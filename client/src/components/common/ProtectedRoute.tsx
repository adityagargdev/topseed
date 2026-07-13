import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { UserRole } from '../../types'
import LoadingSpinner from './LoadingSpinner'

interface Props {
  children: React.ReactNode
  roles?: UserRole[]
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { user, loading } = useAuthStore()

  if (loading) return <LoadingSpinner size="lg" className="min-h-screen" />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />

  return <>{children}</>
}
