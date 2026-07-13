import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { auth } from '../firebase'
import { useNotificationStore } from '../store/notificationStore'
import { Notification } from '../types'

let socket: Socket | null = null

export function useSocket(tournamentId?: string) {
  const socketRef = useRef<Socket | null>(null)
  const addNotification = useNotificationStore(s => s.addNotification)

  useEffect(() => {
    const connect = async () => {
      const token = await auth.currentUser?.getIdToken().catch(() => undefined)

      socket = io(import.meta.env.VITE_SERVER_URL ?? '/', {
        auth: { token },
        transports: ['websocket'],
      })

      socketRef.current = socket

      socket.on('notification', (notif: Notification) => {
        addNotification(notif)
      })

      if (tournamentId) {
        socket.emit('join:tournament', tournamentId)
      }
    }

    connect()

    return () => {
      if (tournamentId && socketRef.current) {
        socketRef.current.emit('leave:tournament', tournamentId)
      }
      socketRef.current?.disconnect()
      socket = null
    }
  }, [tournamentId, addNotification])

  return socketRef.current
}

export function getSocket() {
  return socket
}
