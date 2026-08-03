export class ScoringService {
  constructor(db) {
    this.db = db;
  }

  // Calcular bonus por tiempo relativo al grupo
  calculateTimeBonus(missionId, completionTimeMs) {
    // Obtener tiempos de todos los que completaron esta misión
    const completedTimes = this.db.prepare(`
      SELECT 
        (strftime('%s', completed_at) - strftime('%s', started_at)) * 1000 as duration_ms
      FROM mission_attempts 
      WHERE mission_id = ? AND completed_at IS NOT NULL
      ORDER BY duration_ms ASC
    `).all(missionId);

    if (completedTimes.length < 2) {
      // Si es el primero, bonus máximo
      return 50;
    }

    // Calcular percentil
    const times = completedTimes.map(t => t.duration_ms);
    const position = times.filter(t => t < completionTimeMs).length;
    const percentile = position / times.length;

    if (percentile <= 0.25) return 50;  // Top 25%
    if (percentile <= 0.50) return 25;  // Top 50%
    return 0;                            // Más lento
  }

  // Registrar puntuación de una misión
  recordScore(userId, missionId, basePoints, timeBonus) {
    const totalPoints = basePoints + timeBonus;

    this.db.prepare(`
      INSERT INTO scores (user_id, mission_id, base_points, time_bonus, total_points)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, missionId, basePoints, timeBonus, totalPoints);

    return totalPoints;
  }

  // Obtener puntuación total de un usuario
  getUserTotalScore(userId) {
    const result = this.db.prepare(`
      SELECT COALESCE(SUM(total_points), 0) as total
      FROM scores WHERE user_id = ?
    `).get(userId);

    return result.total;
  }

  // Obtener scoreboard completo
  getScoreboard() {
    return this.db.prepare(`
      SELECT 
        u.id,
        u.nickname as name,
        COALESCE(SUM(s.total_points), 0) as total_score,
        COUNT(DISTINCT s.mission_id) as missions_completed
      FROM users u
      LEFT JOIN scores s ON u.id = s.user_id
      WHERE u.is_active = 1
      GROUP BY u.id, u.nickname
      ORDER BY total_score DESC
    `).all();
  }

  // Verificar y otorgar badges
  checkBadges(userId) {
    const badges = [];

    // Security Master: no generó problemas en misión 5
    const mission5 = this.db.prepare(`
      SELECT decisions FROM mission_attempts 
      WHERE user_id = ? AND mission_id = 5 AND completed_at IS NOT NULL
    `).get(userId);

    if (mission5) {
      const decisions = JSON.parse(mission5.decisions || '{}');
      if (decisions.problemsGenerated === 0) {
        badges.push('security-master');
      }
      if (decisions.problemsFixed === decisions.problemsGenerated && decisions.problemsGenerated > 0) {
        badges.push('quick-learner');
      }
    }

    // Perfect Run: todas correctas a la primera
    const attempts = this.db.prepare(`
      SELECT mission_id, retry_count, is_correct 
      FROM mission_attempts 
      WHERE user_id = ? AND completed_at IS NOT NULL
    `).all(userId);

    if (attempts.length >= 6 && attempts.every(a => a.is_correct && a.retry_count === 0)) {
      badges.push('perfect-run');
    }

    // Clean Freak: misión 6 completada
    const mission6 = attempts.find(a => a.mission_id === 6 && a.is_correct);
    if (mission6) {
      badges.push('clean-freak');
    }

    // Guardar badges nuevos
    for (const badge of badges) {
      const exists = this.db.prepare(
        'SELECT id FROM badges WHERE user_id = ? AND badge_type = ?'
      ).get(userId, badge);

      if (!exists) {
        this.db.prepare(
          'INSERT INTO badges (user_id, badge_type) VALUES (?, ?)'
        ).run(userId, badge);
      }
    }

    return badges;
  }

  // Speed Demon: se calcula al final del workshop
  checkSpeedDemon() {
    const fastest = this.db.prepare(`
      SELECT u.id, u.name,
        SUM(strftime('%s', ma.completed_at) - strftime('%s', ma.started_at)) as total_time
      FROM users u
      JOIN mission_attempts ma ON u.id = ma.user_id
      WHERE ma.completed_at IS NOT NULL
      GROUP BY u.id
      ORDER BY total_time ASC
      LIMIT 3
    `).all();

    for (const user of fastest) {
      const exists = this.db.prepare(
        'SELECT id FROM badges WHERE user_id = ? AND badge_type = ?'
      ).get(user.id, 'speed-demon');

      if (!exists) {
        this.db.prepare(
          'INSERT INTO badges (user_id, badge_type) VALUES (?, ?)'
        ).run(user.id, 'speed-demon');
      }
    }

    return fastest.map(u => u.id);
  }
}
