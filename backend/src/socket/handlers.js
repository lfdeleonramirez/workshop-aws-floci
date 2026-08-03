import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../middleware/auth.js';
import { ScoringService } from '../services/scoring.js';

export function setupSocketHandlers(io, db) {
  // Autenticación de WebSocket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Token requerido'));
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret());
      const user = db.prepare(
        'SELECT id, name FROM users WHERE id = ? AND is_active = 1'
      ).get(decoded.userId);

      if (!user) {
        return next(new Error('Usuario no encontrado'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 ${socket.user.name} conectado al WebSocket`);

    // Unirse a sala general
    socket.join('workshop');

    // Enviar scoreboard actual al conectarse
    const scoring = new ScoringService(db);
    socket.emit('scoreboard:update', scoring.getScoreboard());

    // Notificar a todos que alguien se unió
    io.to('workshop').emit('user:joined', {
      name: socket.user.name,
      totalParticipants: io.sockets.sockets.size
    });

    // Solicitar scoreboard actualizado
    socket.on('scoreboard:request', () => {
      socket.emit('scoreboard:update', scoring.getScoreboard());
    });

    // Desconexión
    socket.on('disconnect', () => {
      console.log(`❌ ${socket.user.name} desconectado`);
      io.to('workshop').emit('user:left', {
        name: socket.user.name,
        totalParticipants: io.sockets.sockets.size - 1
      });
    });
  });
}
