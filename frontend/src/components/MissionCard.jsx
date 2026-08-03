import { motion } from 'framer-motion'
import { Lock, CheckCircle2, ChevronRight } from 'lucide-react'

export default function MissionCard({ mission, index, locked, onClick }) {
  const isCompleted = mission.status === 'completed'

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={!locked ? { scale: 1.02 } : {}}
      whileTap={!locked ? { scale: 0.98 } : {}}
      onClick={!locked ? onClick : undefined}
      disabled={locked}
      className={`w-full text-left p-5 rounded-2xl border transition-all ${
        locked
          ? 'bg-[#1a2332] border-gray-800 opacity-50 cursor-not-allowed'
          : isCompleted
          ? 'bg-[#232f3e] border-green-700/50 hover:border-green-600'
          : 'bg-[#232f3e] border-gray-700 hover:border-[#ff9900] hover:shadow-lg hover:shadow-orange-500/10'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`text-3xl ${locked ? 'grayscale' : ''}`}>
            {mission.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white">{mission.title}</h3>
              {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-400" />}
            </div>
            <p className="text-sm text-gray-400 mt-1">{mission.service}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {mission.concepts?.slice(0, 3).map(concept => (
                <span
                  key={concept}
                  className="px-2 py-0.5 text-xs bg-[#1a2332] text-gray-300 rounded-full"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {locked ? (
            <Lock className="w-5 h-5 text-gray-600" />
          ) : isCompleted ? (
            <span className="text-sm font-semibold text-green-400">{mission.score} pts</span>
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>
    </motion.button>
  )
}
