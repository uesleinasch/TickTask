import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Loader2, Lock } from 'lucide-react'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Progress } from '@renderer/components/ui/progress'
import { cn } from '@renderer/lib/utils'
import type { Task } from '../../../shared/types'

interface SubtaskListProps {
  parentTaskId: number
  isParentBlocked?: boolean
  onSubtaskChange?: () => void
}

export function SubtaskList({ parentTaskId, isParentBlocked, onSubtaskChange }: SubtaskListProps): React.JSX.Element {
  const navigate = useNavigate()
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [showInput, setShowInput] = useState(false)

  const loadSubtasks = useCallback(async (): Promise<void> => {
    try {
      const data = await window.api.listSubtasks(parentTaskId)
      setSubtasks(data)
    } catch (err) {
      console.error('Erro ao carregar subtarefas:', err)
    } finally {
      setLoading(false)
    }
  }, [parentTaskId])

  useEffect(() => {
    loadSubtasks()
  }, [loadSubtasks])

  const handleToggle = async (subtask: Task): Promise<void> => {
    const newStatus = subtask.status === 'finalizada' ? 'inbox' : 'finalizada'
    // Block completing subtasks when parent has unresolved dependencies
    if (newStatus === 'finalizada' && isParentBlocked) return
    try {
      await window.api.updateStatus(subtask.id, newStatus)
      await loadSubtasks()
      onSubtaskChange?.()
    } catch (err) {
      console.error('Erro ao atualizar subtarefa:', err)
    }
  }

  const handleAdd = async (): Promise<void> => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await window.api.createSubtask({ name: newName.trim(), parent_task_id: parentTaskId })
      setNewName('')
      setShowInput(false)
      await loadSubtasks()
      onSubtaskChange?.()
    } catch (err) {
      console.error('Erro ao criar subtarefa:', err)
    } finally {
      setAdding(false)
    }
  }

  const completedCount = subtasks.filter((s) => s.status === 'finalizada').length
  const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
        <Loader2 size={14} className="animate-spin" />
        Carregando subtarefas...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isParentBlocked && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-xs">
          <Lock size={13} className="flex-shrink-0" />
          <span>Subtarefas bloqueadas — conclua as dependências da tarefa pai primeiro.</span>
        </div>
      )}

      {subtasks.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{completedCount}/{subtasks.length} concluídas</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      )}

      <div className="space-y-1">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className={cn(
              'flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 group',
              subtask.status === 'finalizada' && 'opacity-60'
            )}
          >
            <input
              type="checkbox"
              checked={subtask.status === 'finalizada'}
              onChange={() => handleToggle(subtask)}
              disabled={isParentBlocked && subtask.status !== 'finalizada'}
              title={isParentBlocked && subtask.status !== 'finalizada' ? 'Conclua as dependências da tarefa pai primeiro' : undefined}
              className={cn(
                'h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400 flex-shrink-0',
                isParentBlocked && subtask.status !== 'finalizada'
                  ? 'cursor-not-allowed opacity-40'
                  : 'cursor-pointer'
              )}
            />
            <button
              onClick={() => navigate(`/task/${subtask.id}`)}
              className={cn(
                'text-sm text-slate-700 flex-1 min-w-0 truncate text-left hover:text-slate-900 hover:underline',
                subtask.status === 'finalizada' && 'line-through text-slate-400'
              )}
              title="Abrir subtarefa"
            >
              {subtask.name}
            </button>
          </div>
        ))}
      </div>

      {showInput ? (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da subtarefa..."
            className="h-8 text-sm border-slate-300"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') {
                setShowInput(false)
                setNewName('')
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="h-8 bg-slate-900 text-white hover:bg-slate-800 px-3"
          >
            {adding ? <Loader2 size={14} className="animate-spin" /> : 'Adicionar'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setShowInput(false); setNewName('') }}
            className="h-8 px-2 text-slate-500"
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInput(true)}
          className="h-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 text-xs"
        >
          <Plus size={14} className="mr-1" />
          Nova subtarefa
        </Button>
      )}
    </div>
  )
}
