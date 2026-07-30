import { useState, useCallback, useMemo } from 'react'
import clsx from 'clsx'
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  PointerSensor, KeyboardSensor, KeyboardCode, useSensor, useSensors,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent, DragCancelEvent, KeyboardCoordinateGetter, Announcements, ScreenReaderInstructions } from '@dnd-kit/core'

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
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid={`kanban-card-${item.id}`}
      className="cursor-grab touch-none rounded-card outline-none active:cursor-grabbing focus-visible:ring-[3px] focus-visible:ring-teal focus-visible:ring-offset-2"
    >
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
    <div data-testid={`kanban-column-${column.id}`} className="flex h-full w-[280px] flex-shrink-0 flex-col rounded-card border border-line bg-white">
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

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'Para escolher um item, pressione espaço ou enter. Enquanto estiver arrastando, use as setas ' +
    'esquerda e direita para mover entre as colunas do quadro. Pressione espaço ou enter novamente ' +
    'para soltar o item na coluna atual, ou escape para cancelar.',
}

export default function KanbanBoard<T extends { id: string }>({ columns, items, getItemColumn, renderCard, onDrop }: KanbanBoardProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Move o item por coluna inteira (esquerda/direita) em vez do deslocamento em pixels padrão do
  // dnd-kit — não há conceito de "posição" dentro da coluna neste board (sem reordenação
  // persistida), só qual coluna o item está. `columns` já está na mesma ordem visual da renderização.
  const coordinateGetter = useCallback<KeyboardCoordinateGetter>((event, { active, currentCoordinates, context }) => {
    if (event.code !== KeyboardCode.Left && event.code !== KeyboardCode.Right) return undefined

    const overId = context.over?.id != null ? String(context.over.id) : null
    const item = items.find(i => i.id === String(active))
    const currentColumnId = overId ?? (item ? getItemColumn(item) : null)
    if (!currentColumnId) return undefined

    const currentIndex = columns.findIndex(c => c.id === currentColumnId)
    if (currentIndex === -1) return undefined

    const nextColumn = columns[event.code === KeyboardCode.Right ? currentIndex + 1 : currentIndex - 1]
    if (!nextColumn) return undefined

    const currentRect = context.droppableRects.get(currentColumnId)
    const nextRect = context.droppableRects.get(nextColumn.id)
    if (!currentRect || !nextRect) return undefined

    event.preventDefault()
    return { x: currentCoordinates.x + (nextRect.left - currentRect.left), y: currentCoordinates.y }
  }, [columns, items, getItemColumn])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter })
  )

  const getColumnLabel = useCallback((id?: string | null) => columns.find(c => c.id === id)?.label, [columns])

  const announcements = useMemo<Announcements>(() => ({
    onDragStart() {
      return 'Item selecionado. Use as setas esquerda e direita para mover entre colunas do quadro, espaço ou enter para soltar, escape para cancelar.'
    },
    onDragOver({ over }) {
      const label = getColumnLabel(over ? String(over.id) : null)
      return label ? `Item sobre a coluna ${label}.` : 'Item fora de qualquer coluna do quadro.'
    },
    onDragEnd({ over }) {
      const label = getColumnLabel(over ? String(over.id) : null)
      return label ? `Item solto na coluna ${label}.` : 'Item solto fora de qualquer coluna.'
    },
    onDragCancel() {
      return 'Arraste cancelado, o item permanece na coluna original.'
    },
  }), [getColumnLabel])

  const activeItem = items.find(i => i.id === activeId) ?? null

  const dispararToast = (mensagem: string) => {
    setToast(mensagem)
    setTimeout(() => setToast(null), 3000)
  }

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const handleDragCancel = (_e: DragCancelEvent) => setActiveId(null)

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
      <DndContext
        sensors={sensors}
        accessibility={{ announcements, screenReaderInstructions }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
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
        <div role="alert" aria-live="assertive" className="fixed left-1/2 top-5 z-[200] -translate-x-1/2 animate-[fadeUp_.25s_ease_both] whitespace-nowrap rounded-input bg-danger px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(192,73,43,0.6)]">
          {toast}
        </div>
      )}
    </div>
  )
}
