import jwt from 'jsonwebtoken';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está configurado. El servidor no debió llegar aquí sin pasar por index.js');
  return secret;
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const db = req.app.get('db');

    // Verificar que el usuario existe y la sesión no ha expirado
    const user = db.prepare(
      'SELECT * FROM users WHERE id = ? AND is_active = 1 AND session_expires_at > datetime(?)'
    ).get(decoded.userId, new Date().toISOString());

    if (!user) {
      return res.status(401).json({ error: 'Sesión expirada o inválida' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}
