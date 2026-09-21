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
      <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-canvas transition-colors">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ink">{name}</span>
            <span className={`text-[9px] mono-brutal px-2 py-0.5 rounded-full border-2 border-line font-bold ${
              isEnabled ? 'bg-[#c8a2ff] text-on-accent' : 'bg-muted text-subtext'
            }`}>
              {isEnabled ? value.toUpperCase() : 'OFF'}
            </span>
          </div>
          <p className="text-[10px] mono-brutal text-subtext mt-0.5">{desc}</p>
        </div>
        <div id="caveman-group" className="flex gap-1 ml-3 flex-shrink-0">
          {levels.map(lv => {
            const active = value === lv.key
            return (
              <button
                key={lv.key}
                onClick={() => onToggle(name, lv.key)}
                className={`px-2.5 py-1 rounded-lg text-[10px] mono-brutal font-bold transition-all border-2 border-line ${
                  active
                    ? 'bg-[#c8a2ff] text-on-accent'
                    : 'bg-surface text-subtext hover:bg-muted hover:text-ink'
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
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-canvas transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">{name}</span>
          <span className={`text-[9px] mono-brutal px-2 py-0.5 rounded-full border-2 border-line font-bold ${
            isEnabled ? 'bg-[#3ddc97] text-on-accent' : 'bg-muted text-subtext'
          }`}>
            {isEnabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>
        <p className="text-[10px] mono-brutal text-subtext mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onToggle(name, isEnabled ? 'false' : 'true')}
        className={`brutal-btn px-3 py-1.5 text-[10px] font-bold transition-all flex-shrink-0 ml-3 ${
          isEnabled
            ? 'bg-[#ff6b5e] text-white'
            : 'bg-[#3ddc97] text-on-accent'
        }`}
      >
        {isEnabled ? 'DISABLE' : 'ENABLE'}
      </button>
    </div>
  )
}
