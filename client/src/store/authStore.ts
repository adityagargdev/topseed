import { create } from 'zustand'
import { User } from '../types'
import api from '../lib/axios'

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  syncUser: () => Promise<void>
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  syncUser: async () => {
    try {
      const { data } = await api.post<User>('/auth/sync')
      set({ user: data })
    } catch {
      set({ user: null })
    }
  },
  clear: () => set({ user: null }),
}))
