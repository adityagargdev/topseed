import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { notificationApi } from '../../api/notifications'
import { formatDateTime } from '../../lib/utils'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, setNotifications, markRead, markAllRead } = useNotificationStore()

  useEffect(() => {
    notificationApi.list().then(setNotifications).catch(() => {})
  }, [setNotifications])

  const handleMarkRead = async (id: string) => {
    await notificationApi.markRead(id).catch(() => {})
    markRead(id)
  }

  const handleMarkAllRead = async () => {
    await notificationApi.markAllRead().catch(() => {})
    markAllRead()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-20">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-gray-900">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-primary-600 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y">
              {notifications.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">No notifications yet</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && handleMarkRead(n.id)}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50' : ''}`}
                  >
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
