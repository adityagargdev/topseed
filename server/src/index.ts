import 'dotenv/config'
import http from 'http'
import app from './app'
import { initSocket } from './socket'

const PORT = Number(process.env.PORT) || 5000

const httpServer = http.createServer(app)
initSocket(httpServer)

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} [${process.env.NODE_ENV ?? 'development'}]`)
})
