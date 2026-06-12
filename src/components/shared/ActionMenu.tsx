import React, { useState, useRef, useEffect } from 'react'
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

export default function ActionMenu({ items, align = 'right' }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
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

      {open && (
        <div style={{
          position: 'absolute',
          top: 40,
          [align === 'right' ? 'right' : 'left']: 0,
          zIndex: 40,
          width: 180,
          background: '#fff',
          border: '1px solid #EFEDE8',
          borderRadius: 12,
          boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)',
          padding: 6,
          animation: 'pop .14s ease both',
        }}>
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
        </div>
      )}
    </div>
  )
}
