export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      className="border-2 border-line rounded-[18px] p-6 text-center bg-[#ff6b5e]/15"
      style={{ boxShadow: 'var(--brutal-shadow, 6px 6px 0px 0px var(--shadow))' }}
    >
      <div className="mono-brutal text-ink text-xs mb-3 font-bold uppercase">ERROR: {message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="brutal-btn bg-[#ff6b5e] text-white px-4 py-1.5 text-[11px] uppercase"
        >
          RETRY
        </button>
      )}
    </div>
  )
}
