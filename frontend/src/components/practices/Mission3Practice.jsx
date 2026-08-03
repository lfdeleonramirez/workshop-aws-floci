import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import StepCard from '../StepCard'
import CommandInline from '../CommandInline'
import { api } from '../../lib/api'

export default function Mission3Practice({ onExecute, onStepComplete, onReady, progress }) {
  const [missionConfig, setMissionConfig] = useState(null)
  const [instanceType, setInstanceType] = useState(null)
  const [selectedPorts, setSelectedPorts] = useState([])
  const [sgGroupId, setSgGroupId] = useState(progress?.createSecurityGroup?.groupId || null)
  const [step, setStep] = useState(1)
  const [executing, setExecuting] = useState(false)
  const [lastCommands, setLastCommands] = useState({})

  useEffect(() => {
    api.getMissionConfig(3).then(data => {
      setMissionConfig(data.config)
    }).catch(() => {})
  }, [])

  useState(() => {
    if (progress?.createSecurityGroup) {
      setSgGroupId(progress.createSecurityGroup.groupId)
      setStep(2)
      if (progress?.addIngressRule) {
        setStep(3)
        if (progress?.launchInstance) {
          setStep(4)
          setTimeout(() => onReady(), 0)
        }
      }
    }
  })

  const sgStep = missionConfig?.steps?.find(s => s.action === 'createSecurityGroup')
  const portsStep = missionConfig?.steps?.find(s => s.action === 'addIngressRule')
  const launchStep = missionConfig?.steps?.find(s => s.action === 'launchInstance')

  const portOptions = portsStep?.portOptions || [
    { port: 22, name: 'SSH', description: 'Acceso remoto al servidor' },
    { port: 80, name: 'HTTP', description: 'Tráfico web sin encriptar' },
    { port: 443, name: 'HTTPS', description: 'Tráfico web encriptado' },
    { port: 0, name: 'Todos (0-65535)', description: 'Abre todos los puertos del servidor' }
  ]

  const instanceTypes = launchStep?.instanceTypes || [
    { type: 't2.micro', cpu: '1 vCPU', ram: '1 GB', label: 'Micro (gratis)' },
    { type: 't2.small', cpu: '1 vCPU', ram: '2 GB', label: 'Small' },
    { type: 't2.medium', cpu: '2 vCPU', ram: '4 GB', label: 'Medium' }
  ]

  const handleCreateSG = async () => {
    setExecuting(true)
    try {
      const result = await onExecute('createSecurityGroup', {
        groupName: 'workshop-sg',
        description: 'Security group del workshop'
      })
      setSgGroupId(result.data?.groupId)
      setLastCommands(prev => ({ ...prev, createSG: { command: result.command, message: result.message } }))
      setStep(2)
      onStepComplete()
    } finally {
      setExecuting(false)
    }
  }

  const handleAddRules = async () => {
    if (selectedPorts.length === 0) return toast.error('Selecciona al menos un puerto')
    setExecuting(true)
    try {
      const allCommands = []
      for (const portOption of selectedPorts) {
        const fromPort = portOption.port === 0 ? 0 : portOption.port
        const toPort = portOption.port === 0 ? 65535 : portOption.port
        const result = await onExecute('addIngressRule', {
          groupId: sgGroupId,
          port: fromPort,
          toPort,
          cidr: '0.0.0.0/0'
        })
        if (result.command) allCommands.push(result.command)
      }
      setLastCommands(prev => ({ ...prev, addRules: { command: allCommands.join('\n'), message: `${selectedPorts.length} regla(s) aplicada(s)` } }))
      setStep(3)
      onStepComplete()
    } finally {
      setExecuting(false)
    }
  }

  const handleLaunch = async () => {
    if (!instanceType) return toast.error('Selecciona un tipo de instancia')
    setExecuting(true)
    try {
      const result = await onExecute('launchInstance', {
        instanceType: instanceType.type,
        securityGroupId: sgGroupId,
        keyName: 'workshop-key'
      })
      setLastCommands(prev => ({ ...prev, launch: { command: result.command, message: result.message } }))
      setStep(4)
      onStepComplete()
      onReady()
    } finally {
      setExecuting(false)
    }
  }

  const togglePort = (portOption) => {
    if (step > 2) return
    if (portOption.port === 0) {
      setSelectedPorts([portOption])
    } else {
      setSelectedPorts(prev => {
        const filtered = prev.filter(p => p.port !== 0)
        const exists = filtered.find(p => p.port === portOption.port)
        return exists ? filtered.filter(p => p.port !== portOption.port) : [...filtered, portOption]
      })
    }
  }

  if (!missionConfig) return null

  return (
    <div className="space-y-4">
      <StepCard step={1} currentStep={step} title={sgStep?.title || 'Crea un Security Group (firewall)'}>
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            {sgStep?.description || 'Antes de lanzar tu servidor, necesitas definir qué tráfico puede entrar.'}
          </p>
          {step === 1 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateSG}
              disabled={executing}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Creando...' : 'Crear Security Group'}
            </motion.button>
          )}
          <CommandInline {...(lastCommands.createSG || {})} />
        </div>
      </StepCard>

      <StepCard step={2} currentStep={step} title={portsStep?.title || '¿Qué puertos abrir?'}>
        <div className="space-y-3">
          {portsStep?.scenario && (
            <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-xl">
              <p className="text-sm text-blue-200">
                📋 <strong>Escenario:</strong> {portsStep.scenario}
              </p>
              {portsStep.hint && (
                <p className="text-xs text-blue-300/70 mt-2">
                  💡 {portsStep.hint}
                </p>
              )}
            </div>
          )}

          <p className="text-sm text-gray-400">Selecciona los puertos que necesitas abrir:</p>
          <div className="grid gap-2">
            {portOptions.map(option => {
              const isSelected = selectedPorts.find(p => p.port === option.port)
              return (
                <button
                  key={option.port}
                  onClick={() => togglePort(option)}
                  disabled={step > 2}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-[#ff9900] bg-[#ff9900]/10'
                      : 'border-gray-700 bg-[#1a2332] hover:border-gray-500'
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {option.name} {option.port > 0 && <span className="text-gray-400">({option.port})</span>}
                    </p>
                    <p className="text-xs text-gray-400">{option.description}</p>
                  </div>
                </button>
              )
            })}
          </div>
          {step === 2 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddRules}
              disabled={executing || selectedPorts.length === 0}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Aplicando reglas...' : 'Aplicar reglas'}
            </motion.button>
          )}
          <CommandInline {...(lastCommands.addRules || {})} />
        </div>
      </StepCard>

      <StepCard step={3} currentStep={step} title={launchStep?.title || 'Lanza tu instancia EC2'}>
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Elige el tamaño de tu servidor:</p>
          <div className="grid gap-2">
            {instanceTypes.map(type => (
              <button
                key={type.type}
                onClick={() => setInstanceType(type)}
                disabled={step > 3}
                className={`text-left p-3 rounded-xl border transition-all ${
                  instanceType?.type === type.type
                    ? 'border-[#ff9900] bg-[#ff9900]/10'
                    : 'border-gray-700 bg-[#1a2332] hover:border-gray-500'
                }`}
              >
                <p className="text-sm font-medium text-white">{type.label}</p>
                <p className="text-xs text-gray-400">{type.cpu} · {type.ram} · <span className="font-mono">{type.type}</span></p>
              </button>
            ))}
          </div>
          {step === 3 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleLaunch}
              disabled={executing || !instanceType}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Lanzando...' : '🚀 Lanzar instancia'}
            </motion.button>
          )}
          <CommandInline {...(lastCommands.launch || {})} />
        </div>
      </StepCard>
    </div>
  )
}
