import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import StepCard from '../StepCard'
import CommandInline from '../CommandInline'
import { api } from '../../lib/api'

export default function Mission1Practice({ onExecute, onStepComplete, onReady, progress }) {
  const [missionConfig, setMissionConfig] = useState(null)
  const [userName, setUserName] = useState(progress?.createUser?.userName || '')
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [step, setStep] = useState(1)
  const [executing, setExecuting] = useState(false)
  const [lastCommands, setLastCommands] = useState({})

  useEffect(() => {
    api.getMissionConfig(1).then(data => {
      setMissionConfig(data.config)
    }).catch(() => {})
  }, [])

  useState(() => {
    if (progress?.createUser) {
      setUserName(progress.createUser.userName)
      setStep(2)
      if (progress?.attachPolicy) {
        setStep(3)
        setTimeout(() => onReady(), 0)
      }
    }
  })

  useEffect(() => {
    if (missionConfig && progress?.attachPolicy) {
      const policyStep = missionConfig.steps?.find(s => s.action === 'attachPolicy')
      const found = policyStep?.options?.find(p => p.arn === progress.attachPolicy.policyArn)
      if (found) setSelectedPolicy(found)
    }
  }, [missionConfig, progress])

  const policyStep = missionConfig?.steps?.find(s => s.action === 'attachPolicy')
  const policies = policyStep?.options || []

  const handleCreateUser = async () => {
    if (!userName.trim()) return toast.error('Escribe un nombre de usuario')
    setExecuting(true)
    try {
      const result = await onExecute('createUser', { userName: userName.trim() })
      setLastCommands(prev => ({ ...prev, createUser: { command: result.command, message: result.message } }))
      setStep(2)
      onStepComplete()
    } catch (err) {
      // handled by parent
    } finally {
      setExecuting(false)
    }
  }

  const handleAttachPolicy = async () => {
    if (!selectedPolicy) return toast.error('Selecciona una política')
    setExecuting(true)
    try {
      const result = await onExecute('attachPolicy', { userName: userName.trim(), policyArn: selectedPolicy.arn })
      setLastCommands(prev => ({ ...prev, attachPolicy: { command: result.command, message: result.message } }))
      setStep(3)
      onStepComplete()
      onReady()
    } catch (err) {
      // handled by parent
    } finally {
      setExecuting(false)
    }
  }

  if (!missionConfig) return null

  return (
    <div className="space-y-4">
      <StepCard step={1} currentStep={step} title={missionConfig.steps?.[0]?.title || 'Crea un usuario IAM'}>
        <div className="space-y-3">
          <label className="block text-sm text-gray-400">Nombre del usuario</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            placeholder={missionConfig.steps?.[0]?.fields?.[0]?.placeholder || 'mi-usuario'}
            className="w-full px-4 py-2.5 bg-[#1a2332] border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff9900] font-mono text-sm"
            disabled={step > 1}
          />
          {step === 1 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateUser}
              disabled={executing || !userName.trim()}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Creando...' : 'Crear usuario'}
            </motion.button>
          )}
          <CommandInline {...(lastCommands.createUser || {})} />
        </div>
      </StepCard>

      <StepCard step={2} currentStep={step} title={policyStep?.title || 'Asigna una política de permisos'}>
        <div className="space-y-3">
          {policyStep?.scenario && (
            <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-xl">
              <p className="text-sm text-blue-200">
                📋 <strong>Escenario:</strong> {policyStep.scenario}
              </p>
              {policyStep.hint && (
                <p className="text-xs text-blue-300/70 mt-2">
                  💡 {policyStep.hint}
                </p>
              )}
            </div>
          )}

          <p className="text-sm text-gray-400">
            ¿Qué política le asignarás a <span className="text-[#ff9900] font-mono">{userName}</span>?
          </p>
          <div className="grid gap-2">
            {policies.map(policy => (
              <button
                key={policy.arn}
                onClick={() => setSelectedPolicy(policy)}
                disabled={step > 2}
                className={`text-left p-3 rounded-xl border transition-all ${
                  selectedPolicy?.arn === policy.arn
                    ? 'border-[#ff9900] bg-[#ff9900]/10'
                    : 'border-gray-700 bg-[#1a2332] hover:border-gray-500'
                } ${step > 2 ? 'opacity-50' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium text-white font-mono">{policy.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{policy.description}</p>
                </div>
              </button>
            ))}
          </div>
          {step === 2 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAttachPolicy}
              disabled={executing || !selectedPolicy}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Asignando...' : 'Asignar política'}
            </motion.button>
          )}
          <CommandInline {...(lastCommands.attachPolicy || {})} />
        </div>
      </StepCard>
    </div>
  )
}
