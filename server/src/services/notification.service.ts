import prisma from '../config/prisma'
import { emitNotification } from '../socket'

export async function notifyMatchUpdate(
  matchId: string,
  tournamentId: string,
  title: string,
  body: string,
  type: 'scoreUpdates' | 'matchStart' | 'statusChange'
) {
  // Find all users with notifications enabled for this tournament
  const settings = await prisma.notificationSetting.findMany({
    where: {
      tournamentId,
      [type]: true,
    },
    select: { userId: true },
  })

  if (settings.length === 0) return

  const notifications = await prisma.notification.createManyAndReturn({
    data: settings.map(s => ({
      userId: s.userId,
      matchId,
      tournamentId,
      title,
      body,
    })),
  })

  // Push to each connected user via socket
  for (const notif of notifications) {
    emitNotification(notif.userId, notif)
  }
}
