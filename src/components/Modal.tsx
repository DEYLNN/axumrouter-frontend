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
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 pt-16 sm:pt-0 pb-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} mx-4 rounded-[18px] border-2 border-line bg-surface p-6 max-h-[calc(100vh-5rem)] overflow-y-auto`}
        style={{ boxShadow: '8px 8px 0px 0px var(--shadow)' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
