import { useState, useEffect, useCallback } from 'react'
import { X, Lock, Search, Loader2 } from 'lucide-react'
import { Input } from '@renderer/components/ui/input'
import { Button } from '@renderer/components/ui/button'
import { cn } from '@renderer/lib/utils'
import type { Task, TaskDependency } from '../../../shared/types'

interface DependencySelectorProps {
  taskId: number
  onDependenciesChange?: () => void
}

export function DependencySelector({ taskId, onDependenciesChange }: DependencySelectorProps): React.JSX.Element {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadDependencies = useCallback(async (): Promise<void> => {
    try {
      const [deps, tasks] = await Promise.all([
        window.api.getDependencies(taskId),
        window.api.listTasks()
      ])
      setDependencies(deps)
      setAllTasks(tasks.filter((t) => t.id !== taskId))
    } catch (err) {
      console.error('Erro ao carregar dependências:', err)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    loadDependencies()
  }, [loadDependencies])

  const handleAdd = async (dependsOnId: number): Promise<void> => {
    try {
      await window.api.addDependency(taskId, dependsOnId)
      await loadDependencies()
      onDependenciesChange?.()
      setSearch('')
      setShowPicker(false)
    } catch (err) {
      console.error('Erro ao adicionar dependência:', err)
    }
  }

  const handleRemove = async (dependsOnId: number): Promise<void> => {
    try {
      await window.api.removeDependency(taskId, dependsOnId)
      await loadDependencies()
      onDependenciesChange?.()
    } catch (err) {
      console.error('Erro ao remover dependência:', err)
    }
  }

  const dependencyIds = new Set(dependencies.map((d) => d.depends_on_task_id))
  const filteredTasks = allTasks.filter(
    (t) =>
      !dependencyIds.has(t.id) &&
      t.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
        <Loader2 size={14} className="animate-spin" />
        Carregando dependências...
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {dependencies.length > 0 && (
        <div className="space-y-1.5">
          {dependencies.map((dep) => {
            const depTask = allTasks.find((t) => t.id === dep.depends_on_task_id)
            const isFinished = depTask?.status === 'finalizada'

            return (
              <div
                key={dep.depends_on_task_id}
                className={cn(
                  'flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-sm',
                  isFinished
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-orange-200 bg-orange-50 text-orange-700'
                )}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <Lock size={12} className="flex-shrink-0" />
                  <span className="truncate">{dep.depends_on_task_name}</span>
                  {isFinished && (
                    <span className="text-xs text-green-600 flex-shrink-0">✓ concluída</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(dep.depends_on_task_id)}
                  className="flex-shrink-0 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showPicker ? (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tarefa..."
                className="pl-8 h-8 text-sm border-slate-200"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredTasks.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">Nenhuma tarefa encontrada</div>
            ) : (
              filteredTasks.slice(0, 10).map((task) => (
                <button
                  key={task.id}
                  onClick={() => handleAdd(task.id)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="flex-1 truncate">{task.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">{task.status}</span>
                </button>
              ))
            )}
          </div>
          <div className="p-2 border-t border-slate-100">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowPicker(false); setSearch('') }}
              className="h-7 text-xs w-full text-slate-500"
            >
              Fechar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPicker(true)}
          className="h-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 text-xs"
        >
          <Lock size={14} className="mr-1" />
          Adicionar dependência
        </Button>
      )}
    </div>
  )
}
