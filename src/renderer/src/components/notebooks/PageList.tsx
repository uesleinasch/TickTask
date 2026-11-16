import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FilePlus2, IndentDecrease, IndentIncrease, Plus, Trash2 } from 'lucide-react'
import type { NotebookPageSummary } from '@shared/types'
import { MAX_PAGE_DEPTH, flattenPageTree } from '@shared/notebookTree'
import { cn } from '@renderer/lib/utils'
import { UNTITLED_PAGE, pageDndId } from './notebookUi'

interface PageRowProps {
  page: NotebookPageSummary
  depth: number
  active: boolean
  canIndent: boolean
  onSelect: () => void
  onAddSubpage: () => void
  onIndent: () => void
  onOutdent: () => void
  onDelete: () => void
}

function RowAction({
  title,
  onClick,
  danger,
  children
}: {
  title: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      title={title}
      className={cn('p-0.5 text-slate-400', danger ? 'hover:text-red-600' : 'hover:text-slate-700')}
    >
      {children}
    </button>
  )
}

function PageRow({
  page,
  depth,
  active,
  canIndent,
  onSelect,
  onAddSubpage,
  onIndent,
  onOutdent,
  onDelete
}: PageRowProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pageDndId(page.id)
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        paddingLeft: 12 + depth * 16
      }}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={cn(
        'group flex items-center gap-1 pr-2 py-1.5 border-l-2 cursor-pointer select-none transition-colors',
        active
          ? 'bg-slate-100 border-slate-900 text-slate-900'
          : 'border-transparent text-slate-600 hover:bg-slate-50'
      )}
    >
      <span
        className={cn(
          'flex-1 min-w-0 truncate text-sm',
          depth === 0 && 'font-medium',
          !page.title && 'italic text-slate-400'
        )}
      >
        {page.title || UNTITLED_PAGE}
      </span>
      <span className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
        {depth < MAX_PAGE_DEPTH && (
          <RowAction title="Nova subpágina" onClick={onAddSubpage}>
            <FilePlus2 size={13} />
          </RowAction>
        )}
        {depth > 0 && (
          <RowAction title="Promover (sobe um nível)" onClick={onOutdent}>
            <IndentDecrease size={13} />
          </RowAction>
        )}
        {canIndent && (
          <RowAction title="Tornar subpágina da anterior" onClick={onIndent}>
            <IndentIncrease size={13} />
          </RowAction>
        )}
        <RowAction title="Excluir página" onClick={onDelete} danger>
          <Trash2 size={13} />
        </RowAction>
      </span>
    </div>
  )
}

interface PageListProps {
  pages: NotebookPageSummary[]
  selectedId: number | null
  disabled: boolean
  canIndent: (pageId: number) => boolean
  onSelect: (id: number) => void
  onCreate: (parentId: number | null) => void
  onIndent: (id: number) => void
  onOutdent: (id: number) => void
  onDelete: (page: NotebookPageSummary) => void
}

export function PageList({
  pages,
  selectedId,
  disabled,
  canIndent,
  onSelect,
  onCreate,
  onIndent,
  onOutdent,
  onDelete
}: PageListProps): React.JSX.Element {
  const flat = flattenPageTree(pages)

  return (
    <div className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200 min-h-0">
      <button
        onClick={() => onCreate(null)}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40"
      >
        <Plus size={16} />
        Nova página
      </button>
      <div className="flex-1 overflow-y-auto py-1" style={{ scrollbarWidth: 'thin' }}>
        {!disabled && flat.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-400">Nenhuma página nesta seção.</p>
        )}
        <SortableContext
          items={flat.map((f) => pageDndId(f.page.id))}
          strategy={verticalListSortingStrategy}
        >
          {flat.map(({ page, depth }) => (
            <PageRow
              key={page.id}
              page={page}
              depth={depth}
              active={page.id === selectedId}
              canIndent={canIndent(page.id)}
              onSelect={() => onSelect(page.id)}
              onAddSubpage={() => onCreate(page.id)}
              onIndent={() => onIndent(page.id)}
              onOutdent={() => onOutdent(page.id)}
              onDelete={() => onDelete(page)}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
