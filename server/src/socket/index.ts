import { Server as HttpServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import admin from '../config/firebase-admin'
import prisma from '../config/prisma'

let io: SocketIOServer

export function initSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  })

  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth.token as string | undefined
    if (!token) return next() // allow unauthenticated for public views

    try {
      const decoded = await admin.auth().verifyIdToken(token)
      const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } })
      if (user) {
        socket.data.userId = user.id
        socket.data.role = user.role
      }
    } catch {
      // unauthenticated connection still allowed for public data
    }
    next()
  })

  io.on('connection', (socket: Socket) => {
    // Join a tournament room to receive live updates
    socket.on('join:tournament', (tournamentId: string) => {
      socket.join(`tournament:${tournamentId}`)
    })

    socket.on('leave:tournament', (tournamentId: string) => {
      socket.leave(`tournament:${tournamentId}`)
    })

    // Join personal notification room
    if (socket.data.userId) {
      socket.join(`user:${socket.data.userId}`)
    }
  })

  return io
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

// Emit score update to all viewers of a tournament
export function emitScoreUpdate(tournamentId: string, matchId: string, payload: Record<string, unknown>) {
  getIO().to(`tournament:${tournamentId}`).emit('score:update', { matchId, ...payload })
}

// Emit a notification to a specific user
export function emitNotification(userId: string, notification: unknown) {
  getIO().to(`user:${userId}`).emit('notification', notification)
}

// Emit match status change (LIVE / COMPLETED)
export function emitMatchStatus(tournamentId: string, matchId: string, status: string) {
  getIO().to(`tournament:${tournamentId}`).emit('match:status', { matchId, status })
}
