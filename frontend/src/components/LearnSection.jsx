import { motion } from 'framer-motion'
import { Lightbulb, ArrowRight } from 'lucide-react'
import { missionContent } from '../data/missions'

export default function LearnSection({ mission, onContinue }) {
  const content = missionContent[mission?.id]

  if (!content) return null

  return (
    <div className="space-y-6">
      {/* Explicación principal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#232f3e] rounded-2xl p-6 border border-gray-700"
      >
        <h2 className="text-xl font-bold text-white mb-4">{content.title}</h2>
        <p className="text-gray-300 leading-relaxed">{content.explanation}</p>
      </motion.div>

      {/* Conceptos clave */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#232f3e] rounded-2xl p-6 border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Conceptos clave</h3>
        <div className="grid gap-3 md:grid-cols-2">
          {content.concepts.map((concept, i) => (
            <motion.div
              key={concept.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="flex items-start gap-3 p-3 bg-[#1a2332] rounded-xl"
            >
              <span className="text-xl">{concept.icon}</span>
              <div>
                <p className="font-medium text-white text-sm">{concept.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">{concept.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Analogía */}
      {content.analogy && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-[#ff9900]/10 to-transparent rounded-2xl p-6 border border-[#ff9900]/20"
        >
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-[#ff9900] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#ff9900] mb-1">Piénsalo así</p>
              <p className="text-gray-300">{content.analogy}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Botón continuar */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onContinue}
        className="w-full py-3 px-4 bg-gradient-to-r from-[#ff9900] to-[#ff6600] text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-500/25 transition-shadow"
      >
        Empezar a practicar
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </div>
  )
}
