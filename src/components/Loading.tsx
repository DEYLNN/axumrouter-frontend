export function Loading({ text = 'LOADING...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="mono-brutal text-xs font-bold text-[#111111] uppercase tracking-widest animate-pulse">{text}</div>
    </div>
  )
}
