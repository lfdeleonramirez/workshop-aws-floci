import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getJwtSecret } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { accessCode, nickname, fullName } = req.body;
  const db = req.app.get('db');

  // Validar código de acceso
  const validCode = process.env.WORKSHOP_ACCESS_CODE;
  if (!validCode) {
    return res.status(500).json({ error: 'El servidor no tiene configurado WORKSHOP_ACCESS_CODE. Contacta al instructor.' });
  }
  if (accessCode !== validCode) {
    return res.status(403).json({ error: 'Código de acceso inválido' });
  }

  if (!nickname || nickname.trim().length < 2) {
    return res.status(400).json({ error: 'Nickname requerido (mínimo 2 caracteres)' });
  }

  if (!fullName || fullName.trim().length < 2) {
    return res.status(400).json({ error: 'Nombre completo requerido' });
  }

  const sessionHours = parseInt(process.env.SESSION_DURATION_HOURS) || 4;

  // Verificar si ya existe un usuario activo con ese nickname (reconexión)
  const existingUser = db.prepare(
    'SELECT * FROM users WHERE nickname = ? AND is_active = 1 AND session_expires_at > datetime(?)'
  ).get(nickname.trim(), new Date().toISOString());

  if (existingUser) {
    // Reutilizar sesión existente
    const token = jwt.sign({ userId: existingUser.id }, getJwtSecret(), { expiresIn: `${sessionHours}h` });
    return res.json({
      token,
      user: {
        id: existingUser.id,
        nickname: existingUser.nickname,
        fullName: existingUser.full_name,
        expiresAt: existingUser.session_expires_at
      }
    });
  }

  // Verificar que el nickname no esté en uso por otro usuario activo
  const nicknameTaken = db.prepare(
    'SELECT id FROM users WHERE nickname = ? AND is_active = 1'
  ).get(nickname.trim());

  if (nicknameTaken) {
    return res.status(409).json({ error: `El nickname "${nickname}" ya está en uso. Elige otro.` });
  }

  // Verificar límite de sesiones
  const maxSessions = parseInt(process.env.MAX_SESSIONS) || 50;
  const activeSessions = db.prepare(
    'SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND session_expires_at > datetime(?)'
  ).get(new Date().toISOString());

  if (activeSessions.count >= maxSessions) {
    return res.status(503).json({ error: 'Workshop lleno. No hay más cupos disponibles.' });
  }

  // Crear usuario nuevo
  const userId = uuidv4();
  const expiresAt = new Date(Date.now() + sessionHours * 60 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO users (id, nickname, full_name, name, session_expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, nickname.trim(), fullName.trim(), nickname.trim(), expiresAt);

  // Generar token
  const token = jwt.sign({ userId }, getJwtSecret(), { expiresIn: `${sessionHours}h` });

  res.json({
    token,
    user: {
      id: userId,
      nickname: nickname.trim(),
      fullName: fullName.trim(),
      expiresAt
    }
  });
});

export default router;
