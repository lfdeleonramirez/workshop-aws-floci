import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, LogOut, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { connectSocket, getSocket } from '../lib/socket'
import MissionCard from '../components/MissionCard'

export default function Dashboard() {
  const { user, token, logout } = useAuth()
  const [missions, setMissions] = useState([])
  const [totalScore, setTotalScore] = useState(0)
  const [participants, setParticipants] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    loadMissions()
    const socket = connectSocket(token)

    socket.on('user:joined', (data) => {
      setParticipants(data.totalParticipants)
    })

    socket.on('user:left', (data) => {
      setParticipants(data.totalParticipants)
    })

    return () => {
      const s = getSocket()
      if (s) {
        s.off('user:joined')
        s.off('user:left')
      }
    }
  }, [token])

  const loadMissions = async () => {
    try {
      const data = await api.getMissions()
      setMissions(data.missions)
      setTotalScore(data.missions.reduce((sum, m) => sum + m.score, 0))
    } catch (err) {
      console.error(err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Hola, {user?.nickname} 👋</h1>
          <p className="text-gray-400 text-sm mt-1">Completa las misiones y escala en el ranking</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/scoreboard')}
            className="flex items-center gap-2 px-4 py-2 bg-[#232f3e] border border-gray-700 rounded-xl text-gray-300 hover:text-[#ff9900] hover:border-[#ff9900] transition-colors"
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Scoreboard</span>
          </button>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            title="Salir"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8"
      >
        <div className="bg-[#232f3e] rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Puntuación</p>
          <p className="text-2xl font-bold text-[#ff9900]">{totalScore}</p>
        </div>
        <div className="bg-[#232f3e] rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">Misiones</p>
          <p className="text-2xl font-bold text-white">
            {missions.filter(m => m.status === 'completed').length}/{missions.length}
          </p>
        </div>
        <div className="bg-[#232f3e] rounded-xl p-4 border border-gray-700 col-span-2 md:col-span-1">
          <p className="text-gray-400 text-sm flex items-center gap-1">
            <Users className="w-3 h-3" /> Participantes
          </p>
          <p className="text-2xl font-bold text-white">{participants}</p>
        </div>
      </motion.div>

      {/* Missions Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Misiones</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {missions.map((mission, index) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              index={index}
              locked={index > 0 && missions[index - 1]?.status !== 'completed'}
              onClick={() => navigate(`/mission/${mission.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
