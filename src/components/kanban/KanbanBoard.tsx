import { useState } from 'react'
import clsx from 'clsx'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core'

export interface KanbanColumn {
  id: string
  label: string
  headerStyle: React.CSSProperties
}

interface KanbanBoardProps<T extends { id: string }> {
  columns: KanbanColumn[]
  items: T[]
  getItemColumn: (item: T) => string
  renderCard: (item: T, isDragging: boolean) => React.ReactNode
  onDrop: (itemId: string, fromColumn: string, toColumn: string) => boolean | Promise<boolean>
}

function KanbanCard<T extends { id: string }>({ item, renderCard }: {
  item: T
  renderCard: (item: T, isDragging: boolean) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.35 : 1, zIndex: isDragging ? 10 : undefined }
    : {}
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="cursor-grab touch-none active:cursor-grabbing">
      {renderCard(item, isDragging)}
    </div>
  )
}

function KanbanColumnView<T extends { id: string }>({ column, items, renderCard }: {
  column: KanbanColumn
  items: T[]
  renderCard: (item: T, isDragging: boolean) => React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  return (
    <div className="flex h-full w-[280px] flex-shrink-0 flex-col rounded-card border border-line bg-white">
      <div className="flex flex-shrink-0 items-center justify-between rounded-t-card border-b px-3.5 py-3" style={column.headerStyle}>
        <span className="text-[13px] font-bold text-dark">{column.label}</span>
        <span className="text-[12px] font-semibold text-muted">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={clsx('flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-2.5 transition-colors duration-100', isOver && 'bg-teal/[0.05]')}
      >
        {items.map(item => (
          <KanbanCard key={item.id} item={item} renderCard={renderCard} />
        ))}
        {items.length === 0 && (
          <div className="py-6 text-center text-[12.5px] text-muted">Nenhum item</div>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard<T extends { id: string }>({ columns, items, getItemColumn, renderCard, onDrop }: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const activeItem = items.find(i => i.id === activeId) ?? null

  const dispararToast = (mensagem: string) => {
    setToast(mensagem)
    setTimeout(() => setToast(null), 3000)
  }

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null)
    const itemId = String(e.active.id)
    const toColumn = e.over ? String(e.over.id) : null
    const item = items.find(i => i.id === itemId)
    if (!item || !toColumn) return
    const fromColumn = getItemColumn(item)
    if (fromColumn === toColumn) return
    const permitido = await onDrop(itemId, fromColumn, toColumn)
    if (!permitido) dispararToast('Transição não permitida')
  }

  return (
    <div className="relative flex h-full flex-col">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex h-full items-stretch gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <KanbanColumnView
              key={column.id}
              column={column}
              items={items.filter(item => getItemColumn(item) === column.id)}
              renderCard={renderCard}
            />
          ))}
        </div>
        <DragOverlay>
          {activeItem ? <div className="w-[260px]">{renderCard(activeItem, true)}</div> : null}
        </DragOverlay>
      </DndContext>

      {toast && (
        <div className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-danger px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(192,73,43,0.6)]">
          {toast}
        </div>
      )}
    </div>
  )
}
