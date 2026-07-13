import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: string  // default 'max-w-md'
}

export default function Modal({ open, onClose, children, maxWidth = 'max-w-md' }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`w-full ${maxWidth} mx-4 rounded-2xl border border-white/[0.06] bg-[#0a0f1e] backdrop-blur-xl p-6`}
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
