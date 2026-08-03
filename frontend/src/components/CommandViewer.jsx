import { motion } from 'framer-motion'
import { Terminal, CheckCircle2 } from 'lucide-react'

export default function CommandViewer({ commands }) {
  return (
    <div className="bg-[#0d1117] rounded-xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#161b22] border-b border-gray-800">
        <Terminal className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-400 font-mono">Terminal — AWS CLI</span>
      </div>

      {/* Commands */}
      <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
        {commands.map((cmd, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="flex items-start gap-2">
              <span className="text-green-400 text-xs font-mono mt-0.5">$</span>
              <code className="text-xs text-gray-200 font-mono break-all">{cmd.command}</code>
            </div>
            <div className="flex items-center gap-1.5 ml-4 mt-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-400">{cmd.message}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
