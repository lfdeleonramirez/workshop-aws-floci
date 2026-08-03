import { Router } from 'express';
import { Validator, withRetry } from '../services/validator.js';
import { ScoringService } from '../services/scoring.js';
import { MissionExecutor } from '../services/executor.js';
import { getMissions, getMissionById, getMissionPublicConfig } from '../services/missions-loader.js';

const router = Router();

// GET /api/missions - Lista de misiones con estado del usuario
router.get('/', (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;

  const attempts = db.prepare(`
    SELECT mission_id, is_correct, completed_at 
    FROM mission_attempts 
    WHERE user_id = ? AND completed_at IS NOT NULL
  `).all(userId);

  const scores = db.prepare(`
    SELECT mission_id, total_points 
    FROM scores 
    WHERE user_id = ?
  `).all(userId);

  const missions = getMissions().map(mission => {
    const attempt = attempts.find(a => a.mission_id === mission.id);
    const score = scores.find(s => s.mission_id === mission.id);

    return {
      ...mission,
      status: attempt ? 'completed' : 'pending',
      score: score?.total_points || 0
    };
  });

  res.json({ missions });
});

// GET /api/missions/:id/config - Configuración pública de una misión (sin respuestas)
router.get('/:id/config', (req, res) => {
  const missionId = parseInt(req.params.id);
  const config = getMissionPublicConfig(missionId);

  if (!config) {
    return res.status(404).json({ error: 'Misión no encontrada' });
  }

  res.json({ config });
});

// POST /api/missions/:id/start - Iniciar una misión
router.post('/:id/start', (req, res) => {
  const db = req.app.get('db');
  const missionId = parseInt(req.params.id);
  const userId = req.user.id;

  // Verificar que la misión anterior está completada (excepto la primera)
  if (missionId > 1) {
    const previousCompleted = db.prepare(`
      SELECT id FROM mission_attempts 
      WHERE user_id = ? AND mission_id = ? AND completed_at IS NOT NULL
    `).get(userId, missionId - 1);

    if (!previousCompleted) {
      return res.status(400).json({ error: 'Debes completar la misión anterior primero' });
    }
  }

  // Verificar si ya hay un intento activo
  const activeAttempt = db.prepare(`
    SELECT id, decisions FROM mission_attempts 
    WHERE user_id = ? AND mission_id = ? AND completed_at IS NULL
  `).get(userId, missionId);

  if (!activeAttempt) {
    db.prepare(`
      INSERT INTO mission_attempts (user_id, mission_id) VALUES (?, ?)
    `).run(userId, missionId);
  }

  // Verificar si ya completó esta misión
  const completedAttempt = db.prepare(`
    SELECT id, decisions FROM mission_attempts
    WHERE user_id = ? AND mission_id = ? AND completed_at IS NOT NULL
  `).get(userId, missionId);

  const missionConfig = getMissionPublicConfig(missionId);
  res.json({
    mission: missionConfig,
    started: true,
    progress: activeAttempt ? JSON.parse(activeAttempt.decisions || '{}') : {},
    alreadyCompleted: !!completedAttempt
  });
});

// POST /api/missions/:id/execute - Ejecutar acción de la misión
router.post('/:id/execute', async (req, res) => {
  const db = req.app.get('db');
  const missionId = parseInt(req.params.id);
  const userId = req.user.id;
  const { action, params } = req.body;

  if (!req.user.floci_port) {
    return res.status(400).json({ error: 'No tienes un entorno asignado. Inicia sesión de nuevo.' });
  }

  try {
    // Para misión 5 scanIssues, inyectar decisiones previas del usuario
    let execParams = params;
    if (missionId === 5 && action === 'scanIssues') {
      const allAttempts = db.prepare(`
        SELECT mission_id, decisions FROM mission_attempts WHERE user_id = ?
      `).all(userId);

      let publicBucket = false;
      for (const attempt of allAttempts) {
        const d = JSON.parse(attempt.decisions || '{}');
        // Buscar en múltiples formatos posibles
        if (attempt.mission_id === 2) {
          if (d.createBucket?.isPrivate === false) publicBucket = true;
          if (d.isPrivate === false) publicBucket = true;
        }
      }

      execParams = { ...params, publicBucket };
    }

    const executor = new MissionExecutor(req.user.floci_port);
    const result = await executor.execute(missionId, action, execParams);

    // Guardar decisiones
    const currentAttempt = db.prepare(`
      SELECT decisions FROM mission_attempts
      WHERE user_id = ? AND mission_id = ? AND completed_at IS NULL
    `).get(userId, missionId);

    const currentDecisions = JSON.parse(currentAttempt?.decisions || '{}');
    const updatedDecisions = { ...currentDecisions, [action]: params };

    db.prepare(`
      UPDATE mission_attempts 
      SET decisions = ?
      WHERE user_id = ? AND mission_id = ? AND completed_at IS NULL
    `).run(JSON.stringify(updatedDecisions), userId, missionId);

    res.json({ result, command: result.command });
  } catch (err) {
    console.error('Error ejecutando acción:', err);
    res.status(500).json({ error: 'Error al ejecutar la acción' });
  }
});

// POST /api/missions/:id/validate - Validar y puntuar misión
router.post('/:id/validate', async (req, res) => {
  const db = req.app.get('db');
  const io = req.app.get('io');
  const missionId = parseInt(req.params.id);
  const userId = req.user.id;

  if (!req.user.floci_port) {
    return res.status(400).json({ error: 'No tienes un entorno asignado' });
  }

  try {
    const validator = new Validator(req.user.floci_port);
    const scoring = new ScoringService(db);

    // Obtener decisiones previas para misión 5
    let previousDecisions = {};
    if (missionId === 5) {
      const prevAttempts = db.prepare(`
        SELECT mission_id, decisions FROM mission_attempts 
        WHERE user_id = ? AND completed_at IS NOT NULL
      `).all(userId);

      for (const attempt of prevAttempts) {
        previousDecisions[`mission${attempt.mission_id}`] = JSON.parse(attempt.decisions || '{}');
      }
    }

    // Validar según la misión
    const validationMethod = `validateMission${missionId}`;
    const attemptRow = db.prepare(`
      SELECT decisions FROM mission_attempts 
      WHERE user_id = ? AND mission_id = ? AND completed_at IS NULL
    `).get(userId, missionId);

    const decisions = JSON.parse(attemptRow?.decisions || '{}');

    const validation = missionId === 5
      ? await validator.validateMission5(decisions)
      : await withRetry(() => validator[validationMethod](decisions));

    if (!validation.passed) {
      return res.json({
        passed: false,
        details: validation.details,
        message: 'Misión no completada aún. Revisa los requisitos.'
      });
    }

    // Calcular tiempo
    const attempt = db.prepare(`
      SELECT started_at FROM mission_attempts 
      WHERE user_id = ? AND mission_id = ? AND completed_at IS NULL
    `).get(userId, missionId);

    const completionTimeMs = Date.now() - new Date(attempt.started_at).getTime();
    const timeBonus = scoring.calculateTimeBonus(missionId, completionTimeMs);

    // Registrar puntuación
    const totalPoints = scoring.recordScore(userId, missionId, validation.score, timeBonus);

    // Marcar misión como completada (guardar tanto decisiones del usuario como resultado)
    const userDecisions = JSON.parse(
      db.prepare('SELECT decisions FROM mission_attempts WHERE user_id = ? AND mission_id = ? AND completed_at IS NULL')
        .get(userId, missionId)?.decisions || '{}'
    );
    const finalDecisions = { ...userDecisions, ...validation.details };

    db.prepare(`
      UPDATE mission_attempts 
      SET completed_at = datetime('now'), is_correct = 1, decisions = ?
      WHERE user_id = ? AND mission_id = ? AND completed_at IS NULL
    `).run(JSON.stringify(finalDecisions), userId, missionId);

    // Verificar badges
    const badges = scoring.checkBadges(userId);

    // Emitir actualización de scoreboard
    const scoreboard = scoring.getScoreboard();
    io.emit('scoreboard:update', scoreboard);

    res.json({
      passed: true,
      score: {
        base: validation.score,
        timeBonus,
        total: totalPoints
      },
      details: validation.details,
      badges,
      totalScore: scoring.getUserTotalScore(userId)
    });
  } catch (err) {
    console.error('Error validando misión:', err);
    res.status(500).json({ error: 'Error al validar la misión' });
  }
});

export default router;
