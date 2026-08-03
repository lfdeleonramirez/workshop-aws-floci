import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    const savedToken = localStorage.getItem('workshop_token')
    const savedUser = localStorage.getItem('workshop_user')
    if (savedToken && savedUser) {
      // Verificar que el token sigue siendo válido
      fetch('/api/missions', {
        headers: { Authorization: `Bearer ${savedToken}` }
      }).then(res => {
        if (res.ok) {
          setToken(savedToken)
          setUser(JSON.parse(savedUser))
        } else {
          // Token inválido, limpiar
          localStorage.removeItem('workshop_token')
          localStorage.removeItem('workshop_user')
        }
      }).catch(() => {
        // Sin conexión, usar lo que hay
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      })
    }
  }, [])

  const login = async (accessCode, nickname, fullName) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessCode, nickname, fullName })
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error)
    }

    const data = await res.json()
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('workshop_token', data.token)
    localStorage.setItem('workshop_user', JSON.stringify(data.user))

    // Iniciar sesión (asignar contenedor Floci)
    await fetch('/api/sessions/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`
      }
    })

    return data
  }

  const logout = () => {
    if (token) {
      fetch('/api/sessions/stop', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {})
    }
    setUser(null)
    setToken(null)
    localStorage.removeItem('workshop_token')
    localStorage.removeItem('workshop_user')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
