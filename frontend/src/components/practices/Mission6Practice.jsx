import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trash2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import StepCard from '../StepCard'
import CommandInline from '../CommandInline'
import { api } from '../../lib/api'

export default function Mission6Practice({ onExecute, onStepComplete, onReady }) {
  const [missionConfig, setMissionConfig] = useState(null)
  const [resources, setResources] = useState(null)
  const [deletedResources, setDeletedResources] = useState([])
  const [step, setStep] = useState(1)
  const [executing, setExecuting] = useState(false)
  const [listCommand, setListCommand] = useState(null)
  const [deleteCommands, setDeleteCommands] = useState({})

  useEffect(() => {
    api.getMissionConfig(6).then(data => {
      setMissionConfig(data.config)
    }).catch(() => {})
  }, [])

  const listStep = missionConfig?.steps?.find(s => s.action === 'listResources')
  const deleteStep = missionConfig?.steps?.find(s => s.action === 'deleteResource')

  const handleListResources = async () => {
    setExecuting(true)
    try {
      const result = await onExecute('listResources', {})
      setResources(result.data?.resources || [])
      setListCommand({ command: result.command, message: result.message })
      setStep(2)
      onStepComplete()
    } finally {
      setExecuting(false)
    }
  }

  const handleDeleteResource = async (resource) => {
    setExecuting(true)
    try {
      const result = await onExecute('deleteResource', { resourceType: resource.type, resourceId: resource.id })
      setDeletedResources(prev => [...prev, resource.id])
      setDeleteCommands(prev => ({ ...prev, [resource.id]: { command: result.command, message: result.message } }))
      toast.success(`${resource.name} eliminado`)
      onStepComplete()

      const remaining = resources.filter(r => !deletedResources.includes(r.id) && r.id !== resource.id)
      if (remaining.length === 0) {
        onReady()
      }
    } finally {
      setExecuting(false)
    }
  }

  const handleDeleteAll = async () => {
    setExecuting(true)
    try {
      for (const resource of resources) {
        if (!deletedResources.includes(resource.id)) {
          const result = await onExecute('deleteResource', { resourceType: resource.type, resourceId: resource.id })
          setDeletedResources(prev => [...prev, resource.id])
          setDeleteCommands(prev => ({ ...prev, [resource.id]: { command: result.command, message: result.message } }))
        }
      }
      toast.success('¡Todos los recursos eliminados! 🧹')
      onReady()
    } finally {
      setExecuting(false)
    }
  }

  if (!missionConfig) return null

  return (
    <div className="space-y-4">
      {/* Info de costos */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-yellow-900/20 border border-yellow-700/50 rounded-2xl p-5"
      >
        <p className="text-sm text-yellow-200">
          💰 {missionConfig.costInfo || 'En AWS real, cada recurso activo genera costos. Limpiar lo que no usas es una práctica esencial.'}
        </p>
      </motion.div>

      {/* Paso 1: Listar recursos */}
      <StepCard step={1} currentStep={step} title={listStep?.title || 'Identifica tus recursos activos'}>
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            {listStep?.description || 'Primero, veamos qué recursos creaste durante el workshop.'}
          </p>
          {step === 1 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleListResources}
              disabled={executing}
              className="px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {executing ? 'Escaneando...' : '🔍 Listar mis recursos'}
            </motion.button>
          )}
          <CommandInline {...(listCommand || {})} />
        </div>
      </StepCard>

      {/* Paso 2: Eliminar recursos */}
      {resources && (
        <StepCard step={2} currentStep={step} title={deleteStep?.title || 'Elimina los recursos'}>
          <div className="space-y-3">
            {resources.length === 0 ? (
              <p className="text-sm text-green-300">✓ No tienes recursos activos. ¡Ya está limpio!</p>
            ) : (
              <>
                <div className="space-y-2">
                  {resources.map(resource => {
                    const isDeleted = deletedResources.includes(resource.id)
                    return (
                      <div key={resource.id}>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            isDeleted
                              ? 'border-green-700/50 bg-green-900/10'
                              : 'border-gray-700 bg-[#1a2332]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {isDeleted ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <span className="text-lg">{resource.icon}</span>
                            )}
                            <div>
                              <p className={`text-sm font-medium ${isDeleted ? 'text-green-300 line-through' : 'text-white'}`}>
                                {resource.name}
                              </p>
                              <p className="text-xs text-gray-400">{resource.type} · {resource.id}</p>
                            </div>
                          </div>
                          {!isDeleted && (
                            <button
                              onClick={() => handleDeleteResource(resource)}
                              disabled={executing}
                              className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </motion.div>
                        {deleteCommands[resource.id] && (
                          <div className="ml-4 mt-1">
                            <CommandInline {...deleteCommands[resource.id]} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {deletedResources.length < resources.length && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDeleteAll}
                    disabled={executing}
                    className="w-full py-2 border border-red-700 text-red-300 text-sm font-medium rounded-lg hover:bg-red-900/20 disabled:opacity-50"
                  >
                    {executing ? 'Eliminando...' : '🗑️ Eliminar todo'}
                  </motion.button>
                )}
              </>
            )}
          </div>
        </StepCard>
      )}
    </div>
  )
}
