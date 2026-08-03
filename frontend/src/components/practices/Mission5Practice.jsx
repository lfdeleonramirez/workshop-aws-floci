import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, Shield, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import StepCard from '../StepCard'
import CommandInline from '../CommandInline'
import { api } from '../../lib/api'

export default function Mission5Practice({ onExecute, onStepComplete, onReady }) {
  const [missionConfig, setMissionConfig] = useState(null)
  const [issues, setIssues] = useState(null)
  const [step, setStep] = useState(1)
  const [executing, setExecuting] = useState(false)
  const [fixedIssues, setFixedIssues] = useState([])
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [answeredIssues, setAnsweredIssues] = useState({})
  const [fixCommands, setFixCommands] = useState({})
  const [scanCommand, setScanCommand] = useState(null)

  useEffect(() => {
    api.getMissionConfig(5).then(data => {
      setMissionConfig(data.config)
    }).catch(() => {})
  }, [])

  const remediationMap = {}
  if (missionConfig?.issues) {
    for (const issue of missionConfig.issues) {
      if (issue.remediation) {
        remediationMap[issue.id] = issue.remediation
      }
    }
  }

  const handleScan = async () => {
    setExecuting(true)
    try {
      const result = await onExecute('scanIssues', {})
      setScanCommand({ command: result.command, message: result.message })

      const detectedIssues = []
      const issueMapping = {
        hasAdminPolicy: 'admin-policy',
        publicBucket: 'public-bucket',
        openPorts: 'open-ports',
        lambdaExcessiveRole: 'lambda-excessive-role'
      }

      for (const [dataKey, issueId] of Object.entries(issueMapping)) {
        if (result.data?.[dataKey]) {
          const issueConfig = missionConfig?.issues?.find(i => i.id === issueId)
          if (issueConfig) {
            detectedIssues.push({
              id: issueConfig.id,
              title: issueConfig.title,
              description: issueConfig.description,
              severity: issueConfig.severity
            })
          }
        }
      }

      if (detectedIssues.length === 0) {
        detectedIssues.push({
          id: 'none',
          title: '¡Excelente! No se encontraron problemas',
          description: 'Tomaste buenas decisiones de seguridad en las misiones anteriores. ¡Bien hecho!',
          severity: 'info'
        })
      }

      setIssues(detectedIssues)
      setStep(2)
      onStepComplete()

      if (detectedIssues[0]?.id === 'none') {
        onReady()
      }
    } finally {
      setExecuting(false)
    }
  }

  const handleSelectAnswer = (issueId, optionId) => {
    if (answeredIssues[issueId]) return
    setSelectedAnswers(prev => ({ ...prev, [issueId]: optionId }))
  }

  const handleSubmitAnswer = async (issueId) => {
    const remediation = remediationMap[issueId]
    if (!remediation) return

    const selectedId = selectedAnswers[issueId]
    if (!selectedId) return toast.error('Selecciona una opción')

    const isCorrect = selectedId === 'correct'
    setAnsweredIssues(prev => ({ ...prev, [issueId]: isCorrect }))

    if (isCorrect) {
      setExecuting(true)
      try {
        const result = await onExecute('fixIssue', { issueId })
        setFixedIssues(prev => [...prev, issueId])
        setFixCommands(prev => ({ ...prev, [issueId]: { command: result.command, message: result.message } }))
        toast.success('¡Correcto! Problema remediado (+40 pts)')
      } finally {
        setExecuting(false)
      }
    } else {
      toast.error('Incorrecto. Esa solución no resuelve el problema. (-20 pts)')
    }

    const allAnsweredSoFar = { ...answeredIssues, [issueId]: isCorrect }
    const correctCount = Object.values(allAnsweredSoFar).filter(v => v === true).length
    const incorrectCount = Object.values(allAnsweredSoFar).filter(v => v === false).length
    const totalIssues = issues.filter(i => i.severity !== 'info').length

    await onExecute('saveScore', {
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      totalIssues
    }).catch(() => {})

    onStepComplete()

    const allIssuesIds = issues.filter(i => i.severity !== 'info').map(i => i.id)
    const allAnswered = allIssuesIds.every(id => allAnsweredSoFar[id] !== undefined)
    if (allAnswered) {
      onReady()
    }
  }

  const alertText = missionConfig?.alert || 'Se detectó actividad sospechosa. Escanea tu infraestructura, identifica los problemas y elige la remediación correcta.'

  return (
    <div className="space-y-4">
      {/* Alerta inicial */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-red-900/20 border border-red-700/50 rounded-2xl p-5"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold text-red-300">🚨 Alerta de seguridad</h3>
            <p className="text-sm text-gray-300 mt-1">{alertText}</p>
          </div>
        </div>
      </motion.div>

      {/* Paso 1: Escanear */}
      <StepCard step={1} currentStep={step} title="Escanea tu infraestructura">
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Ejecuta un escaneo de seguridad para identificar vulnerabilidades en tus recursos.
          </p>
          {step === 1 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleScan}
              disabled={executing || !missionConfig}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Escaneando...' : '🔍 Escanear recursos'}
            </motion.button>
          )}
          <CommandInline {...(scanCommand || {})} />
        </div>
      </StepCard>

      {/* Paso 2: Remediar */}
      {issues && (
        <StepCard step={2} currentStep={step} title="Remedia las vulnerabilidades">
          <div className="space-y-4">
            {issues.map(issue => {
              const isAnswered = answeredIssues[issue.id] !== undefined
              const isCorrect = answeredIssues[issue.id]
              const remediation = remediationMap[issue.id]

              if (issue.severity === 'info') {
                return (
                  <motion.div
                    key={issue.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 rounded-xl border border-green-700/50 bg-green-900/10"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-300">{issue.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{issue.description}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              }

              return (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl border ${
                    isAnswered
                      ? isCorrect
                        ? 'border-green-700/50 bg-green-900/10'
                        : 'border-red-700/50 bg-red-900/10'
                      : 'border-gray-700 bg-[#1a2332]'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-3">
                    {isAnswered ? (
                      isCorrect ? <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                    ) : (
                      <Shield className="w-4 h-4 text-red-400 mt-0.5" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${isAnswered ? (isCorrect ? 'text-green-300' : 'text-red-300') : 'text-white'}`}>
                        {issue.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{issue.description}</p>
                    </div>
                  </div>

                  {/* Opciones de remediación */}
                  {remediation && !isAnswered && (
                    <div className="ml-6 space-y-2">
                      <p className="text-xs font-medium text-gray-300 mb-2">{remediation.question}</p>
                      {remediation.options.map(option => (
                        <button
                          key={option.id}
                          onClick={() => handleSelectAnswer(issue.id, option.id)}
                          className={`w-full text-left p-3 rounded-lg border text-sm transition-all ${
                            selectedAnswers[issue.id] === option.id
                              ? 'border-[#ff9900] bg-[#ff9900]/10 text-white'
                              : 'border-gray-700 text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                      {selectedAnswers[issue.id] && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSubmitAnswer(issue.id)}
                          disabled={executing}
                          className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50 mt-2"
                        >
                          {executing ? 'Aplicando...' : 'Confirmar remediación'}
                        </motion.button>
                      )}
                    </div>
                  )}

                  {/* Resultado + comando */}
                  {isAnswered && (
                    <div className="ml-6 mt-2">
                      <p className={`text-xs ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {isCorrect ? '✓ Remediación correcta aplicada (+40 pts)' : '✗ Respuesta incorrecta. El problema persiste. (-20 pts)'}
                      </p>
                      {fixCommands[issue.id] && (
                        <CommandInline {...fixCommands[issue.id]} />
                      )}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </StepCard>
      )}
    </div>
  )
}
