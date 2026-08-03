import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Clock, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { connectSocket, getSocket } from '../lib/socket'

export default function FinalResults() {
  const { user, token } = useAuth()
  const [myScore, setMyScore] = useState(null)
  const [scoreboard, setScoreboard] = useState([])
  const [podiumRevealed, setPodiumRevealed] = useState(false)
  const [showPodium, setShowPodium] = useState(false)
  const [showRest, setShowRest] = useState(false)

  useEffect(() => {
    loadMyScore()
    loadScoreboard()

    const socket = connectSocket(token)

    // Escuchar el evento de revelar podio del admin
    socket.on('podium:reveal', () => {
      setPodiumRevealed(true)
      // Animación secuencial
      setTimeout(() => setShowPodium(true), 500)
      setTimeout(() => setShowRest(true), 2500)
    })

    socket.on('scoreboard:update', (data) => {
      setScoreboard(data)
    })

    return () => {
      const s = getSocket()
      if (s) {
        s.off('podium:reveal')
        s.off('scoreboard:update')
      }
    }
  }, [token])

  const loadMyScore = async () => {
    try {
      const data = await api.getMyScore()
      setMyScore(data)
    } catch (err) {
      console.error(err)
    }
  }

  const loadScoreboard = async () => {
    try {
      const data = await api.getScoreboard()
      setScoreboard(data.scoreboard)
    } catch (err) {
      console.error(err)
    }
  }

  const top3 = scoreboard.slice(0, 3)
  const rest = scoreboard.slice(3)

  // Pantalla de espera con tu puntuación personal
  if (!podiumRevealed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          {/* Puntuación personal animada */}
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Star className="w-16 h-16 text-[#ff9900] mx-auto mb-4" />
          </motion.div>

          <h1 className="text-3xl font-bold text-white mb-2">¡Workshop completado!</h1>
          <p className="text-gray-400 mb-8">Esperando a que el instructor revele los resultados...</p>

          {/* Tu score animado */}
          {myScore && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[#232f3e] rounded-2xl p-6 border border-gray-700"
            >
              <p className="text-gray-400 text-sm mb-2">Tu puntuación</p>
              <motion.p
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                className="text-5xl font-bold text-[#ff9900]"
              >
                {myScore.totalScore}
              </motion.p>
              <p className="text-gray-400 text-sm mt-2">
                {myScore.missionsCompleted}/6 misiones completadas
              </p>

              {/* Badges */}
              {myScore.badges?.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {myScore.badges.map(badge => (
                    <motion.span
                      key={badge.badge_type}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.8 }}
                      className="px-3 py-1 bg-purple-900/30 border border-purple-700/50 rounded-full text-sm text-purple-200"
                    >
                      {getBadgeEmoji(badge.badge_type)} {getBadgeName(badge.badge_type)}
                    </motion.span>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Indicador de espera */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex items-center justify-center gap-2 mt-8 text-gray-400"
          >
            <Clock className="w-4 h-4" />
            <span className="text-sm">El podio se revelará pronto...</span>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // Podio revelado
  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center">
      {/* Título */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="text-center mb-12"
      >
        <Trophy className="w-16 h-16 text-[#ff9900] mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-white">🏁 Resultados Finales</h1>
      </motion.div>

      {/* Podio - Top 3 */}
      {showPodium && (
        <div className="flex items-end justify-center gap-4 mb-12 w-full max-w-2xl">
          {/* 2do lugar */}
          {top3[1] && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
              className="flex flex-col items-center"
            >
              <div className="text-center mb-2">
                <span className="text-4xl">🥈</span>
                <p className="font-bold text-white text-lg mt-1">{top3[1].name}</p>
                <p className="text-[#ff9900] font-bold text-xl">{top3[1].total_score} pts</p>
              </div>
              <div className="w-28 md:w-36 bg-gradient-to-t from-gray-700 to-gray-600 rounded-t-xl flex items-end justify-center pb-4" style={{ height: '140px' }}>
                <span className="text-5xl font-bold text-gray-300">2</span>
              </div>
            </motion.div>
          )}

          {/* 1er lugar */}
          {top3[0] && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 150 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="text-center mb-2"
              >
                <span className="text-5xl">🥇</span>
                <p className="font-bold text-white text-xl mt-1">{top3[0].name}</p>
                <p className="text-[#ff9900] font-bold text-2xl">{top3[0].total_score} pts</p>
                {top3[0].id === user?.id && (
                  <span className="text-xs bg-[#ff9900] text-white px-2 py-0.5 rounded-full">¡Tú!</span>
                )}
              </motion.div>
              <div className="w-28 md:w-36 bg-gradient-to-t from-[#ff9900] to-[#ffb84d] rounded-t-xl flex items-end justify-center pb-4 shadow-lg shadow-orange-500/30" style={{ height: '180px' }}>
                <span className="text-6xl font-bold text-white">1</span>
              </div>
            </motion.div>
          )}

          {/* 3er lugar */}
          {top3[2] && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 150 }}
              className="flex flex-col items-center"
            >
              <div className="text-center mb-2">
                <span className="text-4xl">🥉</span>
                <p className="font-bold text-white text-lg mt-1">{top3[2].name}</p>
                <p className="text-[#ff9900] font-bold text-xl">{top3[2].total_score} pts</p>
              </div>
              <div className="w-28 md:w-36 bg-gradient-to-t from-orange-900 to-orange-800 rounded-t-xl flex items-end justify-center pb-4" style={{ height: '100px' }}>
                <span className="text-5xl font-bold text-orange-300">3</span>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Resto */}
      {showRest && rest.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-xl space-y-2"
        >
          {rest.map((entry, index) => {
            const position = index + 4
            const isMe = entry.id === user?.id

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className={`flex items-center justify-between p-3 rounded-xl border ${
                  isMe ? 'bg-[#ff9900]/10 border-[#ff9900]/50' : 'bg-[#232f3e] border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-8">#{position}</span>
                  <p className={`font-medium ${isMe ? 'text-[#ff9900]' : 'text-white'}`}>
                    {entry.name} {isMe && '(tú)'}
                  </p>
                </div>
                <span className={`font-bold ${isMe ? 'text-[#ff9900]' : 'text-white'}`}>
                  {entry.total_score} pts
                </span>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {showRest && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: rest.length * 0.08 + 0.5 }}
          className="text-center text-gray-400 mt-8 text-sm"
        >
          🎉 ¡Gracias por participar!
        </motion.p>
      )}
    </div>
  )
}

function getBadgeEmoji(type) {
  const map = { 'security-master': '🛡️', 'speed-demon': '⚡', 'clean-freak': '🧹', 'perfect-run': '🎯', 'quick-learner': '💡' }
  return map[type] || '🏆'
}

function getBadgeName(type) {
  const map = { 'security-master': 'Security Master', 'speed-demon': 'Speed Demon', 'clean-freak': 'Clean Freak', 'perfect-run': 'Perfect Run', 'quick-learner': 'Quick Learner' }
  return map[type] || type
}
