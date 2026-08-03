import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, BookOpen, Gamepad2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../lib/api'
import LearnSection from '../components/LearnSection'
import PracticeSection from '../components/PracticeSection'
import ScoreReveal from '../components/ScoreReveal'

const TABS = [
  { id: 'learn', label: 'Aprende', icon: BookOpen },
  { id: 'practice', label: 'Practica', icon: Gamepad2 },
  { id: 'result', label: 'Resultado', icon: Star }
]

export default function Mission() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [mission, setMission] = useState(null)
  const [activeTab, setActiveTab] = useState('learn')
  const [validationResult, setValidationResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({})

  useEffect(() => {
    startMission()
  }, [id])

  const startMission = async () => {
    try {
      const data = await api.startMission(id)
      setMission(data.mission)
      setProgress(data.progress || {})

      // Si ya completó la misión, ir directo al resultado
      if (data.alreadyCompleted) {
        setValidationResult({ passed: true, score: { base: 0, timeBonus: 0, total: 0 }, badges: [], totalScore: 0 })
        setActiveTab('result')
      }
    } catch (err) {
      toast.error(err.message)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const handleExecute = async (action, params) => {
    try {
      const result = await api.executeMissionAction(id, action, params)
      if (result.result.message) {
        toast.success(result.result.message)
      }
      return result.result
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleValidate = async () => {
    try {
      const result = await api.validateMission(id)
      setValidationResult(result)

      if (result.passed) {
        setActiveTab('result')
        toast.success(`¡Misión completada! +${result.score.total} puntos 🎉`)
      } else {
        toast.error(result.message || 'Aún no cumples los requisitos')
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#ff9900]/30 border-t-[#ff9900] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al dashboard
        </button>

        <div className="flex items-center gap-4">
          <span className="text-4xl">{mission?.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Misión {id}: {mission?.title}
            </h1>
            <p className="text-gray-400">{mission?.description}</p>
          </div>
        </div>
      </motion.header>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a2332] p-1 rounded-xl mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const isDisabled = tab.id === 'result' && !validationResult?.passed

          return (
            <button
              key={tab.id}
              onClick={() => !isDisabled && setActiveTab(tab.id)}
              disabled={isDisabled}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#232f3e] text-[#ff9900] shadow-sm'
                  : isDisabled
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'learn' && (
            <LearnSection
              mission={mission}
              onContinue={() => setActiveTab('practice')}
            />
          )}

          {activeTab === 'practice' && (
            <PracticeSection
              missionId={parseInt(id)}
              onExecute={handleExecute}
              onValidate={handleValidate}
              progress={progress}
            />
          )}

          {activeTab === 'result' && validationResult && (
            <ScoreReveal
              result={validationResult}
              onNext={() => {
                // Si completó la última misión, ir a resultados finales
                if (parseInt(id) === 6) {
                  navigate('/results')
                } else {
                  navigate('/dashboard')
                }
              }}
              isFinalMission={parseInt(id) === 6}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
