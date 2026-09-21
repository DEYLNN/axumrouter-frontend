import { useTheme } from '../hooks/useTheme'

const SUN = 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
const MOON = 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'

type Props = { compact?: boolean }

/**
 * Neubrutal appearance switch — sits above the profile card in the sidebar.
 * Segmented LIGHT / DARK control; active side gets the hard-shadow lift.
 */
export default function ThemeToggle({ compact = false }: Props) {
  const { isDark, setTheme } = useTheme()

  const options = [
    { key: 'light' as const, label: 'Light', icon: SUN },
    { key: 'dark' as const, label: 'Dark', icon: MOON },
  ]

  return (
    <div className="space-y-1">
      {!compact && (
        <div className="px-3 mb-3 mono-brutal text-[10px] text-subtext uppercase tracking-widest">
          Appearance
        </div>
      )}

      <div
        role="radiogroup"
        aria-label="Color theme"
        className="flex items-stretch gap-1 p-1 rounded-xl border-2 border-line bg-muted"
      >
        {options.map(opt => {
          const active = (opt.key === 'dark') === isDark
          return (
            <button
              key={opt.key}
              role="radio"
              aria-checked={active}
              aria-label={`${opt.label} theme`}
              onClick={() => setTheme(opt.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg mono-brutal text-[10px] font-bold uppercase tracking-wider transition-all duration-100 ${
                active
                  ? 'bg-primary text-white border-2 border-line shadow-[2px_2px_0px_0px_var(--shadow)]'
                  : 'bg-transparent text-subtext border-2 border-transparent hover:text-ink hover:bg-surface'
              }`}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d={opt.icon} />
              </svg>
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
