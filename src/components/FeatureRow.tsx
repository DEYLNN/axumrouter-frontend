interface FeatureProps {
  name: string
  desc: string
  value: string
  onToggle: (key: string, value: string) => void
  levels?: { key: string; label: string }[]
}

export default function FeatureRow({ name, desc, value, onToggle, levels }: FeatureProps) {
  const isEnabled = value !== "off" && value !== "false" && value !== ""

  // If it has levels (caveman: off/lite/full/ultra)
  if (levels) {
    return (
      <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold text-gray-300">{name}</span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
              isEnabled
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-gray-500/20 text-gray-500 border-gray-500/30'
            }`}>
              {isEnabled ? value.toUpperCase() : 'OFF'}
            </span>
          </div>
          <p className="text-[10px] font-mono text-gray-600 mt-0.5">{desc}</p>
        </div>
        <div id="caveman-group" className="flex gap-1 ml-3 flex-shrink-0">
          {levels.map(lv => {
            const active = value === lv.key
            return (
              <button
                key={lv.key}
                onClick={() => onToggle(name, lv.key)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                  active
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30'
                    : 'bg-black/30 text-gray-500 border border-slate-700 hover:border-purple-500/30 hover:text-gray-300'
                }`}
              >
                {lv.label}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Simple ON/OFF toggle
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-gray-300">{name}</span>
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
            isEnabled
              ? 'bg-green-500/20 text-green-300 border-green-500/40'
              : 'bg-gray-500/20 text-gray-500 border-gray-500/30'
          }`}>
            {isEnabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>
        <p className="text-[10px] font-mono text-gray-600 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onToggle(name, isEnabled ? 'false' : 'true')}
        className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all flex-shrink-0 ml-3 ${
          isEnabled
            ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
            : 'bg-green-500/20 text-green-300 border border-green-500/40 hover:bg-green-500/30'
        }`}
      >
        {isEnabled ? 'DISABLE' : 'ENABLE'}
      </button>
    </div>
  )
}
