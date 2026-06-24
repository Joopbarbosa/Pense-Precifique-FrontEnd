import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icons } from '../ui/Icons'

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
        position: 'fixed',
        top: pos.top,
        ...(pos.right !== undefined ? { right: pos.right } : { left: pos.left }),
        zIndex: 9999,
        width: 180,
        background: '#fff',
        border: '1px solid #EFEDE8',
        borderRadius: 12,
        boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)',
        padding: 6,
        animation: 'pop .14s ease both',
      }}
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.dividerBefore && (
            <div style={{ height: 1, background: '#EFEDE8', margin: '5px 8px' }} />
          )}
          <button
            onClick={() => { item.onClick(); setOpen(false) }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
              fontSize: 13.5,
              fontWeight: 500,
              color: item.danger ? '#C0492B' : '#5C594F',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = item.danger ? '#FCF1ED' : '#F7F5F1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{ display: 'flex', color: item.danger ? '#C0492B' : '#A29E96' }}>
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
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={openMenu}
        aria-label="Mais ações"
        aria-expanded={open}
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          border: 'none',
          background: open ? '#F1F0EC' : 'transparent',
          color: '#8A8780',
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          transition: 'background .12s',
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = '#F1F0EC' }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = 'transparent' }}
      >
        <Icons.dots />
      </button>

      {dropdown}
    </div>
  )
}
