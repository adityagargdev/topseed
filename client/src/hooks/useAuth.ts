import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuthStore } from '../store/authStore'

export function useAuthInit() {
  const { syncUser, clear, setLoading } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await syncUser()
      } else {
        clear()
      }
      setLoading(false)
    })
    return unsub
  }, [syncUser, clear, setLoading])
}
