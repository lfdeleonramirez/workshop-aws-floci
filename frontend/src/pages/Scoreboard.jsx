import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Trophy, Medal, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { connectSocket, getSocket } from '../lib/socket'

export default function Scoreboard() {
  const { user, token } = useAuth()
  const [scoreboard, setScoreboard] = useState([])
  const [userPosition, setUserPosition] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    loadScoreboard()

    const socket = connectSocket(token)
    socket.on('scoreboard:update', (data) => {
      setScoreboard(data)
      const pos = data.findIndex(entry => entry.id === user?.id) + 1
      setUserPosition(pos)
    })

    return () => {
      const s = getSocket()
      if (s) s.off('scoreboard:update')
    }
  }, [token, user])

  const loadScoreboard = async () => {
    try {
      const data = await api.getScoreboard()
      setScoreboard(data.scoreboard)
      setUserPosition(data.userPosition)
    } catch (err) {
      console.error(err)
    }
  }

  const getMedalIcon = (position) => {
    if (position === 1) return '🥇'
    if (position === 2) return '🥈'
    if (position === 3) return '🥉'
    return null
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[#ff9900]" />
            <div>
              <h1 className="text-2xl font-bold text-white">Scoreboard</h1>
              <p className="text-sm text-gray-400">
                <Users className="w-3 h-3 inline" /> {scoreboard.length} participantes
              </p>
            </div>
          </div>

          {userPosition > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-400">Tu posición</p>
              <p className="text-2xl font-bold text-[#ff9900]">#{userPosition}</p>
            </div>
          )}
        </div>
      </motion.header>

      {/* Tabla */}
      <div className="space-y-2">
        {scoreboard.map((entry, index) => {
          const position = index + 1
          const isMe = entry.id === user?.id
          const medal = getMedalIcon(position)

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                isMe
                  ? 'bg-[#ff9900]/10 border-[#ff9900]/50'
                  : position <= 3
                  ? 'bg-[#232f3e] border-gray-600'
                  : 'bg-[#232f3e] border-gray-700'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 text-center">
                  {medal ? (
                    <span className="text-xl">{medal}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">#{position}</span>
                  )}
                </div>
                <div>
                  <p className={`font-medium ${isMe ? 'text-[#ff9900]' : 'text-white'}`}>
                    {entry.name} {isMe && '(tú)'}
                  </p>
                  <p className="text-xs text-gray-400">
                    ⚡ {entry.missions_completed}/6 misiones
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className={`text-lg font-bold ${isMe ? 'text-[#ff9900]' : 'text-white'}`}>
                  {entry.total_score}
                </p>
                <p className="text-xs text-gray-400">pts</p>
              </div>
            </motion.div>
          )
        })}

        {scoreboard.length === 0 && (
          <div className="text-center py-12">
            <Medal className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aún no hay puntuaciones</p>
            <p className="text-sm text-gray-500">Completa misiones para aparecer aquí</p>
          </div>
        )}
      </div>
    </div>
  )
}
