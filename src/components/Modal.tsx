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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} mx-4 rounded-[18px] border-2 border-[#111111] bg-white p-6`}
        style={{ boxShadow: '8px 8px 0px 0px #111111' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
