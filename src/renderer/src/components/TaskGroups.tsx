import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Task } from '@shared/types'
import { TaskList } from './TaskList'
import { TaskTable } from './TaskTable'
import { SortableGroups, GroupDragHandle } from './SortableGroups'

export interface TaskGroup {
  key: string
  label: string
  color?: string
  icon?: string
  tasks: Task[]
}

interface TaskGroupsProps {
  groups: TaskGroup[]
  viewMode: 'cards' | 'table'
  onTaskClick: (taskId: number) => void
  selectedTaskIds: Set<number>
  onToggleTaskSelection: (taskId: number, selected: boolean) => void
  onToggleGroupSelection: (taskIds: number[], selected: boolean) => void
  onScheduleForToday?: (taskId: number) => void
  onReorderGroups?: (activeKey: string, overKey: string) => void
}

export function TaskGroups({
  groups,
  viewMode,
  onTaskClick,
  selectedTaskIds,
  onToggleTaskSelection,
  onToggleGroupSelection,
  onScheduleForToday,
  onReorderGroups
}: TaskGroupsProps): React.JSX.Element {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (key: string): void => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <SortableGroups
      keys={groups.map((group) => group.key)}
      direction="vertical"
      onReorder={onReorderGroups}
      className="space-y-4"
    >
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.key)
        return (
          <SortableGroups.Item
            key={group.key}
            id={group.key}
            className="bg-white border border-slate-200 rounded-sm overflow-hidden"
          >
            <div className="flex items-center hover:bg-slate-50 transition-colors">
              {onReorderGroups && <GroupDragHandle className="pl-2" />}
              <button
                onClick={() => toggle(group.key)}
                className="flex-1 min-w-0 flex items-center gap-2 px-4 py-3"
              >
                {isCollapsed ? (
                  <ChevronRight size={16} className="text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-slate-400 shrink-0" />
                )}
                {group.icon ? (
                  <span className="text-base leading-none">{group.icon}</span>
                ) : (
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: group.color || '#94a3b8' }}
                  />
                )}
                <span className="font-semibold text-slate-800 text-sm truncate">{group.label}</span>
                <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 ml-1">
                  {group.tasks.length}
                </span>
              </button>
            </div>
            {!isCollapsed && (
              <div className="p-4 pt-0">
                {viewMode === 'cards' ? (
                  <TaskList
                    tasks={group.tasks}
                    onTaskClick={onTaskClick}
                    selectedTaskIds={selectedTaskIds}
                    onToggleTaskSelection={onToggleTaskSelection}
                    onScheduleForToday={onScheduleForToday}
                  />
                ) : (
                  <TaskTable
                    tasks={group.tasks}
                    onTaskClick={onTaskClick}
                    selectedTaskIds={selectedTaskIds}
                    onToggleTaskSelection={onToggleTaskSelection}
                    onToggleSelectAll={(selected) =>
                      onToggleGroupSelection(
                        group.tasks.map((task) => task.id),
                        selected
                      )
                    }
                    onScheduleForToday={onScheduleForToday}
                  />
                )}
              </div>
            )}
          </SortableGroups.Item>
        )
      })}
    </SortableGroups>
  )
}
