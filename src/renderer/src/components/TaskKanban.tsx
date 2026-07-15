import { TaskCard } from './TaskCard'
import type { TaskGroup } from './TaskGroups'

interface TaskKanbanProps {
  columns: TaskGroup[]
  onTaskClick: (taskId: number) => void
  selectedTaskIds: Set<number>
  onToggleTaskSelection: (taskId: number, selected: boolean) => void
  onScheduleForToday?: (taskId: number) => void
}

export function TaskKanban({
  columns,
  onTaskClick,
  selectedTaskIds,
  onToggleTaskSelection,
  onScheduleForToday
}: TaskKanbanProps): React.JSX.Element {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const accent = col.color || '#94a3b8'
        return (
          <div
            key={col.key}
            className="flex flex-col w-[300px] shrink-0 bg-slate-50 border border-slate-200 rounded-sm"
          >
            {/* Cabeçalho colorido */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-t-sm border-b"
              style={{ backgroundColor: `${accent}18`, borderBottomColor: `${accent}40` }}
            >
              {col.icon ? (
                <span className="text-base leading-none">{col.icon}</span>
              ) : (
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: accent }}
                />
              )}
              <span className="font-semibold text-slate-800 text-sm truncate flex-1">
                {col.label}
              </span>
              <span className="text-xs text-slate-500 bg-white/70 rounded-full px-2 py-0.5">
                {col.tasks.length}
              </span>
            </div>

            {/* Corpo da coluna */}
            <div className="flex flex-col gap-3 p-3">
              {col.tasks.map((task) => (
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
          </div>
        )
      })}
    </div>
  )
}
