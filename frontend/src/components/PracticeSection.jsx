import { useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import Mission1Practice from './practices/Mission1Practice'
import Mission2Practice from './practices/Mission2Practice'
import Mission3Practice from './practices/Mission3Practice'
import Mission4Practice from './practices/Mission4Practice'
import Mission5Practice from './practices/Mission5Practice'
import Mission6Practice from './practices/Mission6Practice'

const practiceComponents = {
  1: Mission1Practice,
  2: Mission2Practice,
  3: Mission3Practice,
  4: Mission4Practice,
  5: Mission5Practice,
  6: Mission6Practice
}

export default function PracticeSection({ missionId, onExecute, onValidate, progress }) {
  const [stepsCompleted, setStepsCompleted] = useState(0)
  const [canValidate, setCanValidate] = useState(false)
  const [validating, setValidating] = useState(false)

  const PracticeComponent = practiceComponents[missionId]

  if (!PracticeComponent) {
    return <p className="text-gray-400">Misión no disponible aún.</p>
  }

  const handleValidate = async () => {
    setValidating(true)
    try {
      await onValidate()
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PracticeComponent
        onExecute={onExecute}
        onStepComplete={() => setStepsCompleted(prev => prev + 1)}
        onReady={() => setCanValidate(true)}
        progress={progress}
      />

      {/* Botón validar */}
      {canValidate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-900/20 border border-green-700/50 rounded-2xl p-5"
        >
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <p className="font-medium text-green-300">¡Parece que completaste todos los pasos!</p>
              <p className="text-sm text-gray-400 mt-1">
                Haz click en verificar para que validemos tu trabajo y obtengas tu puntuación.
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleValidate}
            disabled={validating}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {validating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verificando recursos en la nube...
              </span>
            ) : (
              '✓ Verificar misión'
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Warning si no ha completado pasos */}
      {!canValidate && stepsCompleted > 0 && (
        <div className="flex items-center gap-2 text-sm text-yellow-400/70">
          <AlertTriangle className="w-4 h-4" />
          Completa todos los pasos para poder verificar
        </div>
      )}
    </div>
  )
}
