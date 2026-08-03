import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, Rocket, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [step, setStep] = useState(1)
  const [accessCode, setAccessCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleCodeSubmit = (e) => {
    e.preventDefault()
    if (!accessCode.trim()) return toast.error('Ingresa el código de acceso')
    setStep(2)
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    if (!nickname.trim()) return toast.error('Ingresa un nickname')
    if (!fullName.trim()) return toast.error('Ingresa tu nombre')
    setLoading(true)

    try {
      await login(accessCode, nickname.trim(), fullName.trim())
      toast.success(`¡Bienvenido/a, ${nickname}! 🚀`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff9900] to-[#ff6600] mb-4"
          >
            <Cloud className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white">AWS Workshop</h1>
          <p className="text-gray-400 mt-2">Tu primer acercamiento a la nube</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleCodeSubmit}
              className="bg-[#232f3e] rounded-2xl p-8 shadow-2xl border border-gray-700"
            >
              <h2 className="text-lg font-semibold text-white mb-1">Ingresa el código</h2>
              <p className="text-sm text-gray-400 mb-5">Tu instructor te lo compartirá al inicio</p>

              <input
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="FLOCI-XXXXXX"
                className="w-full px-4 py-3 bg-[#1a2332] border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent transition-all font-mono text-center text-lg tracking-wider"
                autoFocus
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full mt-5 py-3 px-4 bg-gradient-to-r from-[#ff9900] to-[#ff6600] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/25 transition-shadow"
              >
                Continuar
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleProfileSubmit}
              className="bg-[#232f3e] rounded-2xl p-8 shadow-2xl border border-gray-700"
            >
              <h2 className="text-lg font-semibold text-white mb-1">¿Cómo te llamaremos?</h2>
              <p className="text-sm text-gray-400 mb-5">Tu nickname aparecerá en el scoreboard</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nickname (único)
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.replace(/\s/g, ''))}
                    placeholder="CloudMaster99"
                    className="w-full px-4 py-3 bg-[#1a2332] border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent transition-all text-lg"
                    autoFocus
                    maxLength={20}
                  />
                  <p className="text-xs text-gray-500 mt-1">Sin espacios, máximo 20 caracteres</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tu nombre completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Luis de León"
                    className="w-full px-4 py-3 bg-[#1a2332] border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff9900] focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-[#ff9900] to-[#ff6600] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/25 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    Entrar al Workshop
                  </>
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full mt-3 text-sm text-gray-400 hover:text-white transition-colors"
              >
                ← Cambiar código
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
