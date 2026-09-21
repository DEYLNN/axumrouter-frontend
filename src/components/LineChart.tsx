/**
 * Neubrutal SVG line chart — no chart library.
 * Hard square grid, thick line, optional second series. Fills its container.
 */

export interface Series {
  values: number[]
  color: string
  label: string
}

interface Props {
  series: Series[]
  height?: number
  /** Format the y-axis max label (e.g. compact numbers). */
  fmt?: (n: number) => string
  /** x labels, evenly spaced; first and last are always drawn. */
  xLabels?: string[]
}

export function compact(n: number): string {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T'
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

const W = 100 // viewBox units — scales to container width
const PAD_T = 8
const PAD_B = 18
const PAD_L = 2
const PAD_R = 2

function toPath(values: number[], max: number, h: number): string {
  if (values.length === 0) return ''
  if (values.length === 1) {
    const y = PAD_T + (1 - values[0] / max) * h
    return `M ${PAD_L} ${y.toFixed(2)} L ${W - PAD_R} ${y.toFixed(2)}`
  }
  const step = (W - PAD_L - PAD_R) / (values.length - 1)
  return values
    .map((v, i) => {
      const x = PAD_L + i * step
      const y = PAD_T + (1 - v / max) * h
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

export default function LineChart({ series, height = 200, fmt = compact, xLabels }: Props) {
  const h = height - PAD_T - PAD_B
  const peak = Math.max(1, ...series.flatMap(s => s.values))
  // round the axis up to a friendly number
  const mag = Math.pow(10, Math.floor(Math.log10(peak)))
  const max = Math.ceil(peak / mag) * mag || 1

  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div className="w-full">
      {/* legend */}
      <div className="flex flex-wrap gap-3 mb-3">
        {series.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-line shrink-0" style={{ background: s.color }} />
            <span className="mono-brutal text-[10px] uppercase text-subtext">{s.label}</span>
            <span className="mono-brutal text-[10px] font-bold text-ink">{fmt(s.values.reduce((a, b) => a + b, 0))}</span>
          </div>
        ))}
      </div>

      <div className="relative" style={{ height }}>
        {/* y-axis labels */}
        <div className="absolute inset-y-0 left-0 w-10 flex flex-col justify-between py-2 pointer-events-none">
          {[...gridLines].reverse().map(g => (
            <span key={g} className="mono-brutal text-[9px] text-subtext leading-none">
              {fmt(Math.round(max * g))}
            </span>
          ))}
        </div>

        <div className="absolute inset-y-0 left-11 right-0">
          <svg
            viewBox={`0 0 ${W} ${height}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            {/* horizontal grid */}
            {gridLines.map(g => {
              const y = PAD_T + (1 - g) * h
              return (
                <line
                  key={g}
                  x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                  stroke="var(--line)"
                  strokeWidth={g === 0 ? 0.5 : 0.2}
                  strokeDasharray={g === 0 ? undefined : '1.5 1.5'}
                  vectorEffect="non-scaling-stroke"
                  opacity={g === 0 ? 0.9 : 0.35}
                />
              )
            })}

            {/* series */}
            {series.map(s => (
              <g key={s.label}>
                <path
                  d={`${toPath(s.values, max, h)} L ${W - PAD_R} ${PAD_T + h} L ${PAD_L} ${PAD_T + h} Z`}
                  fill={s.color}
                  opacity={0.12}
                  stroke="none"
                />
                <path
                  d={toPath(s.values, max, h)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  opacity={0.45}
                  transform={`translate(0,1.5)`}
                />
                <path
                  d={toPath(s.values, max, h)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* x-axis labels */}
      {xLabels && xLabels.length > 0 && (
        <div className="flex justify-between ml-11 mt-2 mono-brutal text-[9px] text-subtext uppercase">
          {xLabels.map(l => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  )
}
