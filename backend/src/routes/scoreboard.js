import { Router } from 'express';
import { ScoringService } from '../services/scoring.js';

const router = Router();

// GET /api/scoreboard - Obtener ranking actual
router.get('/', (req, res) => {
  const db = req.app.get('db');
  const scoring = new ScoringService(db);

  const scoreboard = scoring.getScoreboard();
  const userPosition = scoreboard.findIndex(entry => entry.id === req.user.id) + 1;

  res.json({
    scoreboard,
    userPosition,
    totalParticipants: scoreboard.length
  });
});

// GET /api/scoreboard/me - Mi puntuación detallada
router.get('/me', (req, res) => {
  const db = req.app.get('db');
  const userId = req.user.id;

  const scores = db.prepare(`
    SELECT mission_id, base_points, time_bonus, total_points, awarded_at
    FROM scores WHERE user_id = ?
    ORDER BY mission_id ASC
  `).all(userId);

  const badges = db.prepare(`
    SELECT badge_type, awarded_at
    FROM badges WHERE user_id = ?
  `).all(userId);

  const totalScore = scores.reduce((sum, s) => sum + s.total_points, 0);

  res.json({
    scores,
    badges,
    totalScore,
    missionsCompleted: scores.length
  });
});

// GET /api/scoreboard/badges - Todos los badges disponibles
router.get('/badges', (req, res) => {
  res.json({
    badges: [
      { type: 'security-master', icon: '🛡️', name: 'Security Master', description: 'No generaste ningún problema de seguridad' },
      { type: 'speed-demon', icon: '⚡', name: 'Speed Demon', description: 'Top 3 en tiempo total' },
      { type: 'clean-freak', icon: '🧹', name: 'Clean Freak', description: 'Limpieza perfecta' },
      { type: 'perfect-run', icon: '🎯', name: 'Perfect Run', description: 'Todas las decisiones correctas a la primera' },
      { type: 'quick-learner', icon: '💡', name: 'Quick Learner', description: 'Arreglaste todos tus errores en menos de 2 minutos' }
    ]
  });
});

export default router;
