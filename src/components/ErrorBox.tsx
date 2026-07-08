export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="border border-red-900/50 rounded-xl p-6 text-center bg-red-950/10">
      <div className="text-red-400 font-mono text-xs mb-3">ERROR: {message}</div>
      {onRetry && (
        <button onClick={onRetry}
          className="px-4 py-1.5 rounded-lg text-[11px] font-mono font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all">
          RETRY
        </button>
      )}
    </div>
  )
}
