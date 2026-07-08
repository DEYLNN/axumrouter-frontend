export function Loading({ text = 'LOADING...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-xs font-mono text-slate-500 animate-pulse">{text}</div>
    </div>
  )
}
