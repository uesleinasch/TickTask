import { createContext, useContext } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

interface HandleBinding {
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
  setActivatorNodeRef: (element: HTMLElement | null) => void
}

const HandleContext = createContext<HandleBinding | null>(null)

interface SortableGroupsProps {
  keys: string[]
  direction: 'vertical' | 'horizontal'
  onReorder?: (activeKey: string, overKey: string) => void
  className?: string
  children: React.ReactNode
}

export function SortableGroups({
  keys,
  direction,
  onReorder,
  className,
  children
}: SortableGroupsProps): React.JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!onReorder || !over || active.id === over.id) return
    onReorder(String(active.id), String(over.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={keys}
        strategy={
          direction === 'vertical' ? verticalListSortingStrategy : horizontalListSortingStrategy
        }
        disabled={!onReorder}
      >
        <div className={className}>{children}</div>
      </SortableContext>
    </DndContext>
  )
}

interface SortableItemProps {
  id: string
  className?: string
  children: React.ReactNode
}

function SortableItem({ id, className, children }: SortableItemProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1
      }}
      className={cn(className, isDragging && 'relative z-10 shadow-lg')}
    >
      <HandleContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>
        {children}
      </HandleContext.Provider>
    </div>
  )
}

SortableGroups.Item = SortableItem

export function GroupDragHandle({ className }: { className?: string }): React.JSX.Element | null {
  const binding = useContext(HandleContext)
  if (!binding) return null
  return (
    <button
      type="button"
      ref={binding.setActivatorNodeRef}
      {...binding.attributes}
      {...binding.listeners}
      onClick={(event) => event.stopPropagation()}
      title="Arrastar para reordenar"
      className={cn(
        'shrink-0 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing',
        className
      )}
    >
      <GripVertical size={16} />
    </button>
  )
}
