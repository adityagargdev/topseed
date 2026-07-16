import { create } from 'zustand'

interface ThemeState {
  dark: boolean
  toggle: () => void
  init: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  dark: false,

  init: () => {
    const isDark = document.documentElement.classList.contains('dark')
    set({ dark: isDark })
  },

  toggle: () =>
    set((state) => {
      const next = !state.dark
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
      return { dark: next }
    }),
}))
