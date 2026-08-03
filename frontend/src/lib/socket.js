import { io } from 'socket.io-client'

let socket = null

export function connectSocket(token) {
  if (socket?.connected) return socket

  socket = io('/', {
    auth: { token },
    transports: ['websocket']
  })

  socket.on('connect', () => {
    console.log('🔌 Conectado al WebSocket')
  })

  socket.on('disconnect', () => {
    console.log('❌ Desconectado del WebSocket')
  })

  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
