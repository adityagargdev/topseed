import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthInit } from './hooks/useAuth'
import Layout from './components/layout/Layout'
import TournamentLayout from './components/layout/TournamentLayout'
import ProtectedRoute from './components/common/ProtectedRoute'

import Home from './pages/Home'
import Login from './pages/Login'
import Profile from './pages/Profile'
import TournamentList from './pages/tournaments/TournamentList'
import TournamentCreate from './pages/tournaments/TournamentCreate'
import Organization from './pages/tournaments/tournament/Organization'
import Seedings from './pages/tournaments/tournament/Seedings'
import Draws from './pages/tournaments/tournament/Draws'
import Matches from './pages/tournaments/tournament/Matches'
import Players from './pages/tournaments/tournament/Players'
import Winners from './pages/tournaments/tournament/Winners'
import AdminDashboard from './pages/admin/Dashboard'
import AdminRequests from './pages/admin/AdminRequests'
import AdminUsers from './pages/admin/Users'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'tournaments', element: <TournamentList /> },
      {
        path: 'tournaments/create',
        element: (
          <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
            <TournamentCreate />
          </ProtectedRoute>
        ),
      },
      {
        path: 'tournaments/:id',
        element: <TournamentLayout />,
        children: [
          { index: true, element: <Navigate to="organization" replace /> },
          { path: 'organization', element: <Organization /> },
          { path: 'seedings', element: <Seedings /> },
          { path: 'draws', element: <Draws /> },
          { path: 'matches', element: <Matches /> },
          { path: 'players', element: <Players /> },
          { path: 'winners', element: <Winners /> },
        ],
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/requests',
        element: (
          <ProtectedRoute roles={['SUPER_ADMIN']}>
            <AdminRequests />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/users',
        element: (
          <ProtectedRoute roles={['SUPER_ADMIN']}>
            <AdminUsers />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: '/login', element: <Login /> },
])

function AppInner() {
  useAuthInit()
  return <RouterProvider router={router} />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  )
}
