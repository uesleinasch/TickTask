import { useContext, useState } from 'react'
import { Archive, CalendarDays, CheckCheck, ExternalLink, Play, Square, Trash2 } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from '@renderer/components/ui/context-menu'
import { TaskMenuChangedContext } from '@renderer/components/taskMenuContext'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { toast } from '@renderer/components/ui/sonner'
import { useTimerStore } from '@renderer/stores/timerStore'
import { STATUS_LABELS, type Task, type TaskStatus } from '@shared/types'

const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[]

interface TaskContextMenuProps {
  task: Task
  onOpen: () => void
  onScheduleForToday?: (taskId: number) => void
  children: React.ReactNode
}

export function TaskContextMenu({
  task,
  onOpen,
  onScheduleForToday,
  children
}: TaskContextMenuProps): React.JSX.Element {
  const onChanged = useContext(TaskMenuChangedContext)
  const startTimer = useTimerStore((s) => s.startTimer)
  const stopTimer = useTimerStore((s) => s.stopTimer)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const isScheduledToday = task.scheduled_date === new Date().toISOString().split('T')[0]

  const run = async (action: () => Promise<unknown>, success: string): Promise<void> => {
    try {
      await action()
      toast.success(success)
      onChanged()
    } catch (error) {
      console.error('[TaskContextMenu]', error)
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a ação')
    }
  }

  return (
    <>
      <ContextMenu modal={false}>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onSelect={onOpen}>
            <ExternalLink /> Abrir
          </ContextMenuItem>
          {task.is_running ? (
            <ContextMenuItem onSelect={() => void run(() => stopTimer(task.id), 'Timer parado')}>
              <Square /> Parar timer
            </ContextMenuItem>
          ) : (
            <ContextMenuItem
              disabled={task.is_blocked}
              onSelect={() => void run(() => startTimer(task.id), 'Timer iniciado')}
            >
              <Play /> Iniciar timer
            </ContextMenuItem>
          )}
          {onScheduleForToday && (
            <ContextMenuItem onSelect={() => onScheduleForToday(task.id)}>
              <CalendarDays /> {isScheduledToday ? 'Tirar do plano de hoje' : 'Planejar para hoje'}
            </ContextMenuItem>
          )}
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <CheckCheck /> Marcar como
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-44">
              <ContextMenuRadioGroup
                value={task.status}
                onValueChange={(value) => {
                  const status = value as TaskStatus
                  void run(
                    () => window.api.updateStatus(task.id, status),
                    `Marcada como ${STATUS_LABELS[status]}`
                  )
                }}
              >
                {STATUSES.map((status) => (
                  <ContextMenuRadioItem
                    key={status}
                    value={status}
                    disabled={status === 'executando' && task.is_blocked}
                  >
                    {STATUS_LABELS[status]}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={() => void run(() => window.api.archiveTask(task.id), 'Tarefa arquivada')}
          >
            <Archive /> Arquivar
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 /> Excluir
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => {
          setDeleteOpen(false)
          void run(() => window.api.deleteTask(task.id), 'Tarefa deletada')
        }}
      />
    </>
  )
}
