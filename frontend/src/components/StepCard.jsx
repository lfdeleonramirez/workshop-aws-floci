import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'

export default function StepCard({ step, currentStep, title, children }) {
  const isCompleted = currentStep > step
  const isActive = currentStep === step
  const isLocked = currentStep < step

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: step * 0.05 }}
      className={`rounded-2xl border p-5 transition-all ${
        isActive
          ? 'bg-[#232f3e] border-[#ff9900]/50 shadow-lg shadow-orange-500/5'
          : isCompleted
          ? 'bg-[#232f3e] border-green-700/30'
          : 'bg-[#1a2332] border-gray-800 opacity-50'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          isCompleted
            ? 'bg-green-600 text-white'
            : isActive
            ? 'bg-[#ff9900] text-white'
            : 'bg-gray-700 text-gray-400'
        }`}>
          {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step}
        </div>
        <h3 className={`font-medium ${isActive ? 'text-white' : isCompleted ? 'text-green-300' : 'text-gray-500'}`}>
          {title}
        </h3>
      </div>

      {(isActive || isCompleted) && (
        <div className="ml-10">
          {children}
        </div>
      )}
    </motion.div>
  )
}
