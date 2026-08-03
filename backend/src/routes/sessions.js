import { Router } from 'express';
import { DockerService } from '../services/docker.js';

const router = Router();
const dockerService = new DockerService();

const DEV_MODE = process.env.NODE_ENV !== 'production';
const DEV_FLOCI_PORT = parseInt(process.env.FLOCI_BASE_PORT) || 4566;

// POST /api/sessions/start - Asignar contenedor Floci al usuario
router.post('/start', async (req, res) => {
  const db = req.app.get('db');
  const user = req.user;

  // Si ya tiene contenedor asignado, retornar ese
  if (user.floci_port) {
    return res.json({
      message: 'Sesión ya activa',
      port: user.floci_port
    });
  }

  try {
    let assignedPort;

    if (DEV_MODE) {
      // En desarrollo: todos usan el mismo Floci local
      assignedPort = DEV_FLOCI_PORT;
    } else {
      // En producción: asignar un contenedor por usuario
      const basePort = parseInt(process.env.FLOCI_BASE_PORT) || 4566;
      const maxSessions = parseInt(process.env.MAX_SESSIONS) || 50;

      const usedPorts = db.prepare(
        'SELECT floci_port FROM users WHERE is_active = 1 AND floci_port IS NOT NULL'
      ).all().map(row => row.floci_port);

      for (let port = basePort; port < basePort + maxSessions; port++) {
        if (!usedPorts.includes(port)) {
          assignedPort = port;
          break;
        }
      }

      if (!assignedPort) {
        return res.status(503).json({ error: 'No hay contenedores disponibles' });
      }

      // Crear contenedor Floci
      const container = await dockerService.createFlociContainer(assignedPort);
      db.prepare(
        'UPDATE users SET container_id = ? WHERE id = ?'
      ).run(container.id, user.id);
    }

    // Actualizar usuario con el puerto asignado
    db.prepare(
      'UPDATE users SET floci_port = ? WHERE id = ?'
    ).run(assignedPort, user.id);

    res.json({
      message: 'Entorno listo',
      port: assignedPort
    });
  } catch (err) {
    console.error('Error creando sesión:', err);
    res.status(500).json({ error: 'Error al crear tu entorno. Intenta de nuevo.' });
  }
});

// POST /api/sessions/stop - Liberar contenedor
router.post('/stop', async (req, res) => {
  const db = req.app.get('db');
  const user = req.user;

  if (user.container_id) {
    try {
      await dockerService.removeContainer(user.container_id);
    } catch (err) {
      console.error('Error eliminando contenedor:', err);
    }
  }

  db.prepare(
    'UPDATE users SET is_active = 0, floci_port = NULL, container_id = NULL WHERE id = ?'
  ).run(user.id);

  res.json({ message: 'Sesión finalizada' });
});

export default router;
