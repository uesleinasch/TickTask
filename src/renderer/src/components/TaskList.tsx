import { TaskCard } from './TaskCard'
import type { Task } from '../../../shared/types'

interface TaskListProps {
  tasks: Task[]
  onTaskClick: (taskId: number) => void
  selectedTaskIds: Set<number>
  onToggleTaskSelection: (taskId: number, selected: boolean) => void
  onScheduleForToday?: (taskId: number) => void
}

export function TaskList({
  tasks,
  onTaskClick,
  selectedTaskIds,
  onToggleTaskSelection,
  onScheduleForToday
}: TaskListProps): React.JSX.Element {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <p className="text-lg">Nenhuma tarefa encontrada</p>
        <p className="text-sm">Crie uma nova tarefa para começar</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          selected={selectedTaskIds.has(task.id)}
          onToggleSelection={(selected) => onToggleTaskSelection(task.id, selected)}
          onClick={() => onTaskClick(task.id)}
          onScheduleForToday={onScheduleForToday}
        />
      ))}
    </div>
  )
}
