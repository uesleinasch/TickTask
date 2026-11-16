import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { NotebookSection } from '@shared/types'
import { cn } from '@renderer/lib/utils'
import { sectionDndId } from './notebookUi'

interface SectionTabProps {
  section: NotebookSection
  active: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

function SectionTab({
  section,
  active,
  onSelect,
  onEdit,
  onDelete
}: SectionTabProps): React.JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
    active: dragged
  } = useSortable({ id: sectionDndId(section.id) })
  const pageOver = isOver && String(dragged?.id).startsWith('p:')

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        borderTopColor: section.color
      }}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      title={pageOver ? `Mover para ${section.name}` : section.name}
      className={cn(
        'group flex items-center gap-1.5 max-w-[220px] px-3 h-9 border-t-[3px] rounded-t-sm text-sm cursor-pointer select-none transition-colors',
        active
          ? 'bg-white text-slate-900 font-semibold'
          : 'bg-slate-100 text-slate-500 hover:text-slate-800',
        pageOver && 'ring-2 ring-inset ring-slate-400'
      )}
    >
      <span className="truncate">{section.name}</span>
      {active && (
        <span className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title="Renomear seção"
            className="p-0.5 text-slate-400 hover:text-slate-700"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title="Excluir seção"
            className="p-0.5 text-slate-400 hover:text-red-600"
          >
            <Trash2 size={12} />
          </button>
        </span>
      )}
    </div>
  )
}

interface SectionTabsProps {
  sections: NotebookSection[]
  selectedId: number | null
  onSelect: (id: number) => void
  onCreate: () => void
  onEdit: (section: NotebookSection) => void
  onDelete: (section: NotebookSection) => void
}

export function SectionTabs({
  sections,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onDelete
}: SectionTabsProps): React.JSX.Element {
  return (
    <div className="shrink-0 flex items-end gap-1 px-3 pt-2 bg-slate-50 border-b border-slate-200 overflow-x-auto">
      <SortableContext
        items={sections.map((s) => sectionDndId(s.id))}
        strategy={horizontalListSortingStrategy}
      >
        {sections.map((section) => (
          <SectionTab
            key={section.id}
            section={section}
            active={section.id === selectedId}
            onSelect={() => onSelect(section.id)}
            onEdit={() => onEdit(section)}
            onDelete={() => onDelete(section)}
          />
        ))}
      </SortableContext>
      <button
        onClick={onCreate}
        title="Nova seção"
        className="flex items-center justify-center h-9 w-9 shrink-0 rounded-t-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
