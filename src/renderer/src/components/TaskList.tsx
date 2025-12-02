import { TaskCard } from './TaskCard'
import type { Task } from '../../../shared/types'

interface TaskListProps {
  tasks: Task[]
  onTaskClick: (taskId: number) => void
}

export function TaskList({ tasks, onTaskClick }: TaskListProps): React.JSX.Element {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-lg">Nenhuma tarefa encontrada</p>
        <p className="text-sm">Crie uma nova tarefa para começar</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
      ))}
    </div>
  )
}
