import { BookOpen, Download, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import type { Notebook } from '@shared/types'
import { cn } from '@renderer/lib/utils'
import { GroupDragHandle, SortableGroups } from '@renderer/components/SortableGroups'

interface NotebookListProps {
  notebooks: Notebook[]
  selectedId: number | null
  onSelect: (id: number) => void
  onCreate: () => void
  onEdit: (notebook: Notebook) => void
  onDelete: (notebook: Notebook) => void
  onSync: (notebook: Notebook) => void
  syncingId: number | null
  onExport: (notebook: Notebook) => void
  onReorder: (activeKey: string, overKey: string) => void
}

export function NotebookList({
  notebooks,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onSync,
  syncingId,
  onExport,
  onReorder
}: NotebookListProps): React.JSX.Element {
  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white border-r border-slate-200 min-h-0">
      <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold uppercase tracking-widest text-slate-400">
        Cadernos
      </div>
      <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: 'thin' }}>
        {notebooks.length === 0 && (
          <p className="px-4 py-6 text-sm text-slate-400">Nenhum caderno ainda.</p>
        )}
        <SortableGroups
          keys={notebooks.map((n) => String(n.id))}
          direction="vertical"
          onReorder={onReorder}
        >
          {notebooks.map((notebook) => (
            <SortableGroups.Item key={notebook.id} id={String(notebook.id)}>
              <div
                onClick={() => onSelect(notebook.id)}
                className={cn(
                  'group flex items-center gap-2 mx-2 px-2 py-2 rounded-sm cursor-pointer transition-colors',
                  notebook.id === selectedId
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                )}
              >
                <GroupDragHandle className="opacity-0 group-hover:opacity-100" />
                <BookOpen size={16} className="shrink-0" style={{ color: notebook.color }} />
                <span className="flex-1 min-w-0 truncate text-sm font-medium">{notebook.name}</span>
                <div
                  className={cn(
                    'flex items-center transition-opacity',
                    syncingId === notebook.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  )}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onSync(notebook)
                    }}
                    disabled={syncingId !== null}
                    title="Sincronizar o caderno inteiro com o Notion"
                    className="p-1 text-slate-400 hover:text-emerald-600 rounded-md disabled:opacity-50"
                  >
                    <RefreshCw
                      size={13}
                      className={syncingId === notebook.id ? 'animate-spin' : ''}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onExport(notebook)
                    }}
                    title="Exportar o caderno em Markdown"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(notebook)
                    }}
                    title="Renomear caderno"
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(notebook)
                    }}
                    title="Excluir caderno"
                    className="p-1 text-slate-400 hover:text-red-600 rounded-md"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </SortableGroups.Item>
          ))}
        </SortableGroups>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <Plus size={16} />
        Novo caderno
      </button>
    </aside>
  )
}
