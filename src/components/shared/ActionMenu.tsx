import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'
import clsx from 'clsx'

export interface ActionMenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
  dividerBefore?: boolean
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  align?: 'right' | 'left'
}

interface DropdownPos {
  top: number
  left?: number
  right?: number
}

export default function ActionMenu({ items, align = 'right' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<DropdownPos | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (open) { setOpen(false); return }
    const rect = btnRef.current!.getBoundingClientRect()
    const dropW = 180
    if (align === 'right') {
      setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    } else {
      setPos({ top: rect.bottom + 6, left: rect.left })
    }
    // flip left if not enough space on right side
    if (align === 'left' && rect.left + dropW > window.innerWidth) {
      setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = () => setOpen(false)
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const dropdown = open && pos ? createPortal(
    <div
      ref={dropRef}
      style={{
        top: pos.top,
        ...(pos.right !== undefined ? { right: pos.right } : { left: pos.left }),
      }}
      className="fixed z-[9999] w-[180px] animate-pop rounded-xl border border-line bg-white p-1.5 shadow-[0_12px_30px_-8px_rgba(0,0,0,0.18)]"
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.dividerBefore && (
            <div className="mx-2 my-[5px] h-px bg-line" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); item.onClick(); setOpen(false) }}
            className={clsx(
              'flex w-full items-center gap-2.5 rounded-lg border-none bg-transparent px-2.5 py-[9px] text-left font-[inherit] text-[13.5px] font-medium',
              item.danger
                ? 'text-danger hover:bg-[#FCF1ED]'
                : 'text-body hover:bg-cream'
            )}
          >
            <span className={clsx('flex', item.danger ? 'text-danger' : 'text-muted')}>
              {item.icon}
            </span>
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>,
    document.body
  ) : null

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={openMenu}
        aria-label="Mais ações"
        aria-expanded={open}
        className={clsx(
          'grid h-[34px] w-[34px] place-items-center rounded-[9px] border-none text-[#8A8780] transition-colors duration-100',
          open ? 'bg-line-soft' : 'bg-transparent hover:bg-line-soft'
        )}
      >
        <MoreVertical size={18} />
      </button>

      {dropdown}
    </div>
  )
}
