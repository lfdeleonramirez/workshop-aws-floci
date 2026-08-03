import { motion } from 'framer-motion'
import { Terminal, CheckCircle2 } from 'lucide-react'

/**
 * Muestra un comando AWS CLI inline después de ejecutar una acción.
 * Se renderiza dentro del StepCard una vez completado el paso.
 */
export default function CommandInline({ command, message }) {
  if (!command) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 bg-[#0d1117] rounded-xl border border-gray-800 overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161b22] border-b border-gray-800">
        <Terminal className="w-3 h-3 text-gray-500" />
        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">AWS CLI</span>
      </div>
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-start gap-2">
          <span className="text-green-400 text-xs font-mono mt-0.5 select-none">$</span>
          <code className="text-xs text-gray-200 font-mono break-all leading-relaxed">{command}</code>
        </div>
        {message && (
          <div className="flex items-center gap-1.5 ml-4">
            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
            <span className="text-[11px] text-green-400/80">{message}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
