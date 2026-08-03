import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { connectSocket } from './lib/socket'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Mission from './pages/Mission'
import Scoreboard from './pages/Scoreboard'
import AdminScoreboard from './pages/AdminScoreboard'
import FinalResults from './pages/FinalResults'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user, token, logout } = useAuth()

  // Escuchar globalmente el evento de kick out si el usuario está conectado
  useEffect(() => {
    if (token) {
      const socket = connectSocket(token)
      socket.on('admin:kick_all', () => {
        logout()
        window.location.href = '/'
      })

      return () => {
        socket.off('admin:kick_all')
      }
    }
  }, [token, logout])

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/mission/:id" element={<ProtectedRoute><Mission /></ProtectedRoute>} />
      <Route path="/scoreboard" element={<ProtectedRoute><Scoreboard /></ProtectedRoute>} />
      <Route path="/results" element={<ProtectedRoute><FinalResults /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminScoreboard />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
