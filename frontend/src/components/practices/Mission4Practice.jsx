import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import StepCard from '../StepCard'
import CommandInline from '../CommandInline'
import { api } from '../../lib/api'

export default function Mission4Practice({ onExecute, onStepComplete, onReady, progress }) {
  const [missionConfig, setMissionConfig] = useState(null)
  const [functionName, setFunctionName] = useState(progress?.createFunction?.functionName || '')
  const [runtime, setRuntime] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)
  const [invokeResult, setInvokeResult] = useState(null)
  const [step, setStep] = useState(1)
  const [executing, setExecuting] = useState(false)
  const [lastCommands, setLastCommands] = useState({})

  useEffect(() => {
    api.getMissionConfig(4).then(data => {
      setMissionConfig(data.config)
    }).catch(() => {})
  }, [])

  useState(() => {
    if (progress?.createFunction) {
      setFunctionName(progress.createFunction.functionName)
      setStep(3)
      if (progress?.invokeFunction) {
        setStep(4)
        setTimeout(() => onReady(), 0)
      }
    }
  })

  useEffect(() => {
    if (missionConfig && progress?.createFunction) {
      const createStep = missionConfig.steps?.find(s => s.action === 'createFunction')
      const rt = createStep?.runtimes?.find(r => r.value === progress.createFunction.runtime)
      if (rt) setRuntime(rt)
      const role = createStep?.roles?.find(r => r.value === progress.createFunction.role)
      if (role) setSelectedRole(role)
    }
  }, [missionConfig, progress])

  const createStep = missionConfig?.steps?.find(s => s.action === 'createFunction')
  const invokeStep = missionConfig?.steps?.find(s => s.action === 'invokeFunction')

  const runtimes = createStep?.runtimes || []
  const roles = createStep?.roles || []

  const handleSelectRole = () => {
    if (!functionName.trim()) return toast.error('Escribe un nombre para la función')
    if (!runtime) return toast.error('Selecciona un runtime')
    if (!selectedRole) return toast.error('Selecciona un rol')
    setStep(2)
    onStepComplete()
  }

  const handleCreate = async () => {
    setExecuting(true)
    try {
      const result = await onExecute('createFunction', { functionName: functionName.trim(), runtime: runtime.value, role: selectedRole.value })
      setLastCommands(prev => ({ ...prev, create: { command: result.command, message: result.message } }))
      setStep(3)
      onStepComplete()
    } finally {
      setExecuting(false)
    }
  }

  const handleInvoke = async () => {
    setExecuting(true)
    try {
      const result = await onExecute('invokeFunction', { functionName: functionName.trim() })
      setInvokeResult(result.data?.response)
      setLastCommands(prev => ({ ...prev, invoke: { command: result.command, message: result.message } }))
      setStep(4)
      onStepComplete()
      onReady()
    } finally {
      setExecuting(false)
    }
  }

  if (!missionConfig) return null

  return (
    <div className="space-y-4">
      <StepCard step={1} currentStep={step} title={createStep?.title || 'Configura tu función Lambda'}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {createStep?.fields?.[0]?.label || 'Nombre de la función'}
            </label>
            <input
              type="text"
              value={functionName}
              onChange={(e) => setFunctionName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
              placeholder={createStep?.fields?.[0]?.placeholder || 'mi-funcion'}
              className="w-full px-4 py-2.5 bg-[#1a2332] border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff9900] font-mono text-sm"
              disabled={step > 1}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Runtime (lenguaje)</label>
            <div className="grid grid-cols-2 gap-2">
              {runtimes.map(rt => (
                <button
                  key={rt.value}
                  onClick={() => setRuntime(rt)}
                  disabled={step > 1}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    runtime?.value === rt.value
                      ? 'border-[#ff9900] bg-[#ff9900]/10'
                      : 'border-gray-700 bg-[#1a2332] hover:border-gray-500'
                  }`}
                >
                  <span className="text-xl">{rt.icon}</span>
                  <p className="text-xs text-gray-300 mt-1">{rt.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Rol de ejecución</label>
            {createStep?.scenario && (
              <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-xl mb-3">
                <p className="text-sm text-blue-200">
                  📋 <strong>Escenario:</strong> {createStep.scenario}
                </p>
              </div>
            )}
            <div className="grid gap-2">
              {roles.map(role => (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role)}
                  disabled={step > 1}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    selectedRole?.value === role.value
                      ? 'border-[#ff9900] bg-[#ff9900]/10'
                      : 'border-gray-700 bg-[#1a2332] hover:border-gray-500'
                  }`}
                >
                  <p className="text-sm font-medium text-white font-mono">{role.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{role.description}</p>
                </button>
              ))}
            </div>
          </div>

          {step === 1 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSelectRole}
              disabled={!functionName.trim() || !runtime || !selectedRole}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              Continuar
            </motion.button>
          )}
        </div>
      </StepCard>

      <StepCard step={2} currentStep={step} title="Crea la función">
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Función <span className="text-[#ff9900] font-mono">{functionName}</span> con runtime <span className="font-mono">{runtime?.label}</span> y rol <span className="font-mono">{selectedRole?.name}</span>
          </p>
          {step === 2 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreate}
              disabled={executing}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Creando...' : 'Crear función'}
            </motion.button>
          )}
          <CommandInline {...(lastCommands.create || {})} />
        </div>
      </StepCard>

      <StepCard step={3} currentStep={step} title={invokeStep?.title || 'Ejecuta tu función'}>
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            {invokeStep?.description || 'Tu función está lista. ¡Invócala para ver qué responde!'}
          </p>

          {step === 3 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleInvoke}
              disabled={executing}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Ejecutando...' : '⚡ Invocar función'}
            </motion.button>
          )}

          {invokeResult && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-[#1a2332] rounded-xl border border-green-700/50"
            >
              <p className="text-xs text-gray-400 mb-1">Respuesta:</p>
              <p className="text-sm text-green-300 font-mono">{invokeResult}</p>
            </motion.div>
          )}
          <CommandInline {...(lastCommands.invoke || {})} />
        </div>
      </StepCard>
    </div>
  )
}
