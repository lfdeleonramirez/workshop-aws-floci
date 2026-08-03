import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initDatabase } from './db/database.js';
import authRoutes from './routes/auth.js';
import sessionsRoutes from './routes/sessions.js';
import missionsRoutes from './routes/missions.js';
import scoreboardRoutes from './routes/scoreboard.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { authMiddleware } from './middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '../.env');

// Cargar .env base si existe (para PORT, MAX_SESSIONS, etc.)
// WORKSHOP_ACCESS_CODE y JWT_SECRET se regeneran siempre al iniciar,
// a menos que el instructor los haya definido explícitamente en el entorno.
const dataEnvPath = join(__dirname, '../data/.env');
const activeEnvPath = existsSync(dataEnvPath) ? dataEnvPath : existsSync(envPath) ? envPath : null;

if (activeEnvPath) {
  dotenv.config({ path: activeEnvPath });
}

// Generar WORKSHOP_ACCESS_CODE aleatorio si no viene del entorno
if (!process.env.WORKSHOP_ACCESS_CODE) {
  process.env.WORKSHOP_ACCESS_CODE = 'FLOCI-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Generar JWT_SECRET aleatorio si no viene del entorno
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
}

// Generar ADMIN_CODE independiente (no derivado del código de acceso)
if (!process.env.ADMIN_CODE) {
  process.env.ADMIN_CODE = 'ADMIN-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Middleware global
app.use(cors());
app.use(express.json());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Demasiadas solicitudes. Intenta en un momento.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos. Espera un minuto.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// Inicializar base de datos
const db = initDatabase();

// Inyectar dependencias
app.set('db', db);
app.set('io', io);

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/sessions', authMiddleware, sessionsRoutes);
app.use('/api/missions', authMiddleware, missionsRoutes);
app.use('/api/scoreboard', authMiddleware, scoreboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin scoreboard (con código propio)
app.get('/api/admin/scoreboard', (req, res) => {
  const adminCode = req.headers['x-admin-code'] || req.query.code;
  const validAdminCode = process.env.ADMIN_CODE;

  if (adminCode !== validAdminCode) {
    return res.status(403).json({ error: 'Código admin inválido' });
  }

  const scoreboard = db.prepare(`
    SELECT 
      u.nickname,
      u.full_name,
      COALESCE(SUM(s.total_points), 0) as total_score,
      COUNT(DISTINCT s.mission_id) as missions_completed,
      GROUP_CONCAT(DISTINCT b.badge_type) as badges
    FROM users u
    LEFT JOIN scores s ON u.id = s.user_id
    LEFT JOIN badges b ON u.id = b.user_id
    WHERE u.is_active = 1
    GROUP BY u.id, u.nickname, u.full_name
    ORDER BY total_score DESC
  `).all();

  res.json({ scoreboard, adminCode: validAdminCode });
});

// Admin: revelar podio a todos los participantes
app.post('/api/admin/reveal-podium', (req, res) => {
  const adminCode = req.headers['x-admin-code'] || req.body.code;
  const validAdminCode = process.env.ADMIN_CODE;

  if (adminCode !== validAdminCode) {
    return res.status(403).json({ error: 'Código admin inválido' });
  }

  // Emitir evento a todos los clientes conectados
  io.emit('podium:reveal');

  res.json({ message: 'Podio revelado a todos los participantes' });
});

// Admin: limpiar conexiones y expulsar a todos
app.post('/api/admin/clear-connections', (req, res) => {
  const adminCode = req.headers['x-admin-code'] || req.body.code;
  const validAdminCode = process.env.ADMIN_CODE;

  if (adminCode !== validAdminCode) {
    return res.status(403).json({ error: 'Código admin inválido' });
  }

  // 1. Liberar el pool en la base de datos para permitir que entren nuevos usuarios
  const db = req.app.get('db');
  db.prepare('UPDATE users SET is_active = 0').run();

  // 2. Emitir evento para que los clientes frontend limpien su localStorage y redirijan a login
  io.emit('admin:kick_all');
  
  // 3. Desconectar los sockets a la fuerza desde el backend
  io.disconnectSockets(true);

  res.json({ message: 'Todos los clientes han sido desconectados y expulsados' });
});

// WebSocket
setupSocketHandlers(io, db);

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Workshop backend corriendo en puerto ${PORT}`);
  console.log(`🔑 Código de acceso: ${process.env.WORKSHOP_ACCESS_CODE}`);
  console.log(`👑 Código admin: ${process.env.ADMIN_CODE}`);
  console.log(`📊 Scoreboard admin: http://localhost/admin?code=${process.env.ADMIN_CODE}`);
});
