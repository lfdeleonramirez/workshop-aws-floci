import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trophy, Users, RefreshCw, Lock } from 'lucide-react'

export default function AdminScoreboard() {
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [scoreboard, setScoreboard] = useState([])
  const [authenticated, setAuthenticated] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [podiumRevealed, setPodiumRevealed] = useState(false)
  const intervalRef = useRef(null)

  const fetchScoreboard = async (adminCode) => {
    try {
      const res = await fetch(`/api/admin/scoreboard?code=${adminCode || code}`)
      if (!res.ok) {
        setError('Código admin inválido')
        setAuthenticated(false)
        return
      }
      const data = await res.json()
      setScoreboard(data.scoreboard)
      setAuthenticated(true)
      setError('')
      setLastUpdate(new Date())
    } catch {
      setError('Error de conexión')
    }
  }

  useEffect(() => {
    // Si viene con código en la URL, autenticar directo
    const urlCode = searchParams.get('code')
    if (urlCode) {
      setCode(urlCode)
      fetchScoreboard(urlCode)
    }
  }, [searchParams])

  useEffect(() => {
    if (authenticated) {
      // Auto-refresh cada 5 segundos
      intervalRef.current = setInterval(() => fetchScoreboard(), 5000)
      return () => clearInterval(intervalRef.current)
    }
  }, [authenticated, code])

  const handleLogin = (e) => {
    e.preventDefault()
    fetchScoreboard()
  }

  const handleRevealPodium = async () => {
    try {
      const res = await fetch('/api/admin/reveal-podium', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      if (res.ok) {
        setPodiumRevealed(true)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleClearConnections = async () => {
    if (!confirm('¿Estás seguro de expulsar a todos los usuarios?')) return;
    try {
      await fetch('/api/admin/clear-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      alert('Conexiones limpiadas');
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

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#232f3e] rounded-2xl p-8 border border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-[#ff9900]" />
            <h1 className="text-xl font-bold text-white">Admin Scoreboard</h1>
          </div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Código admin"
            className="w-full px-4 py-3 bg-[#1a2332] border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff9900] font-mono"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            className="w-full mt-4 py-3 bg-gradient-to-r from-[#ff9900] to-[#ff6600] text-white font-semibold rounded-xl"
          >
            Entrar
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-[#ff9900]" />
          <div>
            <h1 className="text-3xl font-bold text-white">Scoreboard</h1>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <Users className="w-3 h-3" /> {scoreboard.length} participantes
              {lastUpdate && (
                <span className="flex items-center gap-1">
                  · <RefreshCw className="w-3 h-3 animate-spin" /> Auto-refresh
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {podiumRevealed && (
            <button
              onClick={handleClearConnections}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/25"
            >
              🧹 Limpiar conexiones
            </button>
          )}
          <button
            onClick={handleRevealPodium}
            disabled={podiumRevealed}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              podiumRevealed
                ? 'bg-green-800 text-green-300 cursor-default'
                : 'bg-gradient-to-r from-[#ff9900] to-[#ff6600] text-white hover:shadow-lg hover:shadow-orange-500/25'
            }`}
          >
            {podiumRevealed ? '✓ Podio revelado' : '🏁 Revelar podio'}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="space-y-2">
        {scoreboard.map((entry, index) => {
          const position = index + 1
          const medal = getMedalIcon(position)
          const badges = entry.badges ? entry.badges.split(',') : []

          return (
            <motion.div
              key={entry.nickname}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-center justify-between p-5 rounded-xl border ${
                position <= 3 ? 'bg-[#232f3e] border-[#ff9900]/30' : 'bg-[#232f3e] border-gray-700'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 text-center">
                  {medal ? (
                    <span className="text-2xl">{medal}</span>
                  ) : (
                    <span className="text-lg font-bold text-gray-400">#{position}</span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">{entry.nickname}</p>
                  <p className="text-sm text-gray-400">{entry.full_name}</p>
                  {badges.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {badges.map(b => (
                        <span key={b} className="text-xs px-1.5 py-0.5 bg-purple-900/30 border border-purple-700/50 rounded text-purple-300">
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold text-[#ff9900]">{entry.total_score}</p>
                <p className="text-xs text-gray-400">⚡ {entry.missions_completed}/6 misiones</p>
              </div>
            </motion.div>
          )
        })}

        {scoreboard.length === 0 && (
          <div className="text-center py-16">
            <Trophy className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Esperando participantes...</p>
            <p className="text-sm text-gray-500 mt-1">El scoreboard se actualiza automáticamente</p>
          </div>
        )}
      </div>
    </div>
  )
}
