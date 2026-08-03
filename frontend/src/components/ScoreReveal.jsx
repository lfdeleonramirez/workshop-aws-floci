import { motion } from 'framer-motion'
import { Star, Clock, Trophy, ArrowRight } from 'lucide-react'

export default function ScoreReveal({ result, onNext, isFinalMission }) {
  const { score, badges, totalScore } = result

  return (
    <div className="space-y-6">
      {/* Score principal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="text-center py-8"
      >
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-[#ff9900] to-[#ff6600] mb-4"
        >
          <Star className="w-12 h-12 text-white" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-white"
        >
          ¡Misión completada!
        </motion.h2>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 space-y-1"
        >
          <p className="text-5xl font-bold text-[#ff9900]">+{score.total}</p>
          <p className="text-gray-400 text-sm">puntos</p>
        </motion.div>
      </motion.div>

      {/* Desglose */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-[#232f3e] rounded-2xl p-5 border border-gray-700"
      >
        <h3 className="text-sm font-medium text-gray-400 mb-3">Desglose</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-[#ff9900]" />
              <span className="text-sm text-gray-300">Puntos base</span>
            </div>
            <span className="text-sm font-semibold text-white">{score.base}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">Bonus por velocidad</span>
            </div>
            <span className="text-sm font-semibold text-blue-300">+{score.timeBonus}</span>
          </div>
          {result.details?.incorrectAnswers > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 text-red-400 text-center">✗</span>
                <span className="text-sm text-gray-300">Penalización ({result.details.incorrectAnswers} incorrectas)</span>
              </div>
              <span className="text-sm font-semibold text-red-400">-{result.details.incorrectAnswers * 20}</span>
            </div>
          )}
          <div className="border-t border-gray-700 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#ff9900]" />
              <span className="text-sm font-medium text-white">Puntuación total</span>
            </div>
            <span className="text-lg font-bold text-[#ff9900]">{totalScore}</span>
          </div>
        </div>
      </motion.div>

      {/* Badges obtenidos */}
      {badges && badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-r from-purple-900/20 to-transparent rounded-2xl p-5 border border-purple-700/30"
        >
          <h3 className="text-sm font-medium text-purple-300 mb-3">🏆 ¡Nuevo badge!</h3>
          <div className="flex flex-wrap gap-2">
            {badges.map(badge => (
              <span
                key={badge}
                className="px-3 py-1.5 bg-purple-900/30 border border-purple-600/50 rounded-full text-sm text-purple-200"
              >
                {getBadgeEmoji(badge)} {getBadgeName(badge)}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Botón siguiente */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        className="w-full py-3 px-4 bg-gradient-to-r from-[#ff9900] to-[#ff6600] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/25 transition-shadow"
      >
        {isFinalMission ? '🏁 Ver resultados finales' : 'Siguiente misión'}
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </div>
  )
}

function getBadgeEmoji(type) {
  const map = {
    'security-master': '🛡️',
    'speed-demon': '⚡',
    'clean-freak': '🧹',
    'perfect-run': '🎯',
    'quick-learner': '💡'
  }
  return map[type] || '🏆'
}

function getBadgeName(type) {
  const map = {
    'security-master': 'Security Master',
    'speed-demon': 'Speed Demon',
    'clean-freak': 'Clean Freak',
    'perfect-run': 'Perfect Run',
    'quick-learner': 'Quick Learner'
  }
  return map[type] || type
}
