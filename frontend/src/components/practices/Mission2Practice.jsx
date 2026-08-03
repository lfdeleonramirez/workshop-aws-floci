import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import StepCard from '../StepCard'
import CommandInline from '../CommandInline'
import { api } from '../../lib/api'

export default function Mission2Practice({ onExecute, onStepComplete, onReady, progress }) {
  const [missionConfig, setMissionConfig] = useState(null)
  const [bucketName, setBucketName] = useState(progress?.createBucket?.bucketName || '')
  const [fileName, setFileName] = useState('hola-mundo.txt')
  const [isPrivate, setIsPrivate] = useState(true)
  const [enableVersioning, setEnableVersioning] = useState(false)
  const [step, setStep] = useState(1)
  const [executing, setExecuting] = useState(false)
  const [lastCommands, setLastCommands] = useState({})

  useEffect(() => {
    api.getMissionConfig(2).then(data => {
      setMissionConfig(data.config)
    }).catch(() => {})
  }, [])

  useState(() => {
    if (progress?.createBucket) {
      setBucketName(progress.createBucket.bucketName)
      setIsPrivate(progress.createBucket.isPrivate !== false)
      setStep(2)
      if (progress?.uploadFile) {
        setStep(3)
        if (progress?.enableVersioning !== undefined) {
          setStep(4)
          setTimeout(() => onReady(), 0)
        }
      }
    }
  })

  const bucketStep = missionConfig?.steps?.find(s => s.action === 'createBucket')
  const uploadStep = missionConfig?.steps?.find(s => s.action === 'uploadFile')
  const versioningStep = missionConfig?.steps?.find(s => s.action === 'enableVersioning')

  const handleCreateBucket = async () => {
    if (!bucketName.trim()) return toast.error('Escribe un nombre para el bucket')
    setExecuting(true)
    try {
      const result = await onExecute('createBucket', { bucketName: bucketName.trim(), isPrivate })
      setLastCommands(prev => ({ ...prev, createBucket: { command: result.command, message: result.message } }))
      setStep(2)
      onStepComplete()
    } finally {
      setExecuting(false)
    }
  }

  const handleUploadFile = async () => {
    setExecuting(true)
    try {
      const result = await onExecute('uploadFile', { bucketName: bucketName.trim(), fileName, content: '¡Hola desde el workshop AWS!' })
      setLastCommands(prev => ({ ...prev, uploadFile: { command: result.command, message: result.message } }))
      setStep(3)
      onStepComplete()
    } finally {
      setExecuting(false)
    }
  }

  const handleVersioning = async () => {
    setExecuting(true)
    try {
      if (enableVersioning) {
        const result = await onExecute('enableVersioning', { bucketName: bucketName.trim() })
        setLastCommands(prev => ({ ...prev, enableVersioning: { command: result.command, message: result.message } }))
      }
      setStep(4)
      onStepComplete()
      onReady()
    } finally {
      setExecuting(false)
    }
  }

  if (!missionConfig) return null

  const accessOptions = bucketStep?.accessOptions || [
    { value: true, label: '🔒 Privado (solo yo)' },
    { value: false, label: '🌍 Público (todos)' }
  ]

  const versioningOptions = versioningStep?.options || [
    { value: true, label: 'Sí, habilitar' },
    { value: false, label: 'No, sin versionado' }
  ]

  return (
    <div className="space-y-4">
      <StepCard step={1} currentStep={step} title={bucketStep?.title || 'Crea un bucket S3'}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {bucketStep?.fields?.[0]?.label || 'Nombre del bucket (único global)'}
            </label>
            <input
              type="text"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder={bucketStep?.fields?.[0]?.placeholder || 'mi-primer-bucket-2026'}
              className="w-full px-4 py-2.5 bg-[#1a2332] border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#ff9900] font-mono text-sm"
              disabled={step > 1}
            />
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-2">¿Quién puede acceder?</p>
            {bucketStep?.scenario && (
              <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-xl mb-3">
                <p className="text-sm text-blue-200">
                  📋 <strong>Escenario:</strong> {bucketStep.scenario}
                </p>
              </div>
            )}
            <div className="flex gap-3">
              {accessOptions.map(opt => (
                <button
                  key={String(opt.value)}
                  onClick={() => setIsPrivate(opt.value)}
                  disabled={step > 1}
                  className={`flex-1 p-3 rounded-xl border text-sm transition-all ${
                    isPrivate === opt.value ? 'border-[#ff9900] bg-[#ff9900]/10 text-white' : 'border-gray-700 text-gray-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {step === 1 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateBucket}
              disabled={executing || !bucketName.trim()}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Creando...' : 'Crear bucket'}
            </motion.button>
          )}
          <CommandInline {...(lastCommands.createBucket || {})} />
        </div>
      </StepCard>

      <StepCard step={2} currentStep={step} title={uploadStep?.title || 'Sube un archivo'}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              {uploadStep?.fields?.[0]?.label || 'Nombre del archivo'}
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a2332] border border-gray-600 rounded-xl text-white font-mono text-sm"
              disabled={step > 2}
            />
          </div>
          {step === 2 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUploadFile}
              disabled={executing}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Subiendo...' : '📤 Subir archivo'}
            </motion.button>
          )}
          <CommandInline {...(lastCommands.uploadFile || {})} />
        </div>
      </StepCard>

      <StepCard step={3} currentStep={step} title={versioningStep?.title || '¿Habilitar versionado?'}>
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            {versioningStep?.description || 'El versionado guarda un historial de cada cambio. Si alguien sobreescribe tu archivo, puedes recuperar la versión anterior.'}
          </p>
          <div className="flex gap-3">
            {versioningOptions.map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => setEnableVersioning(opt.value)}
                disabled={step > 3}
                className={`flex-1 p-3 rounded-xl border text-sm transition-all ${
                  enableVersioning === opt.value ? 'border-[#ff9900] bg-[#ff9900]/10 text-white' : 'border-gray-700 text-gray-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {step === 3 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleVersioning}
              disabled={executing}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Aplicando...' : 'Confirmar configuración'}
            </motion.button>
          )}
          <CommandInline {...(lastCommands.enableVersioning || {})} />
        </div>
      </StepCard>
    </div>
  )
}
