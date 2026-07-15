import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { DueDateBadge } from '@renderer/components/DueDateBadge'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { formatTime } from '@renderer/lib/utils'
import type { Task } from '../../../shared/types'
import {
  ArrowLeft,
  CalendarDays,
  GripVertical,
  Clock,
  CheckSquare,
  Lock,
  Activity,
  Calendar,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'

// ===================== Sortable Task Row =====================

interface SortableTaskRowProps {
  task: Task
  onTaskClick: (id: number) => void
}

function SortableTaskRow({ task, onTaskClick }: SortableTaskRowProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all cursor-pointer group',
        isDragging && 'shadow-lg border-slate-300',
        task.is_blocked && 'border-l-4 border-l-orange-300'
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical size={16} />
      </button>

      {/* Status indicator */}
      <div className="flex-shrink-0">
        {task.status === 'finalizada' ? (
          <CheckSquare size={18} className="text-purple-500" />
        ) : task.is_running ? (
          <Activity size={18} className="text-emerald-500 animate-pulse" />
        ) : task.is_blocked ? (
          <Lock size={18} className="text-orange-400" />
        ) : (
          <div className="w-4.5 h-4.5 rounded-full border-2 border-slate-300" />
        )}
      </div>

      {/* Task info */}
      <div
        className="flex-1 min-w-0"
        onClick={() => onTaskClick(task.id)}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              'font-medium text-slate-800 truncate',
              task.status === 'finalizada' && 'line-through text-slate-400'
            )}
          >
            {task.name}
          </span>
          <StatusBadge status={task.status} />
          {task.due_date && <DueDateBadge dueDate={task.due_date} />}
        </div>
        {task.project_name && (
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: task.project_color || '#6366f1' }}
            />
            {task.project_name}
          </p>
        )}
      </div>

      {/* Time */}
      <div className="flex-shrink-0 text-right">
        <span className={cn(
          'font-mono text-sm font-medium',
          task.is_running ? 'text-emerald-600' : 'text-slate-500'
        )}>
          {formatTime(task.total_seconds)}
        </span>
        {task.time_limit_seconds && task.time_limit_seconds > 0 && (
          <p className="text-xs text-slate-400">/ {formatTime(task.time_limit_seconds)}</p>
        )}
      </div>
    </div>
  )
}

// ===================== Weekly Day Column =====================

interface DayColumnProps {
  date: string
  tasks: Task[]
  isToday: boolean
  onTaskClick: (id: number) => void
}

function DayColumn({ date, tasks, isToday, onTaskClick }: DayColumnProps): React.JSX.Element {
  const d = new Date(date + 'T12:00:00')
  const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' })
  const dayNum = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const totalSeconds = tasks.reduce((acc, t) => acc + (t.time_limit_seconds || 0), 0)

  return (
    <div
      className={cn(
        'flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden min-w-[160px] flex-1',
        isToday && 'border-blue-300 shadow-md'
      )}
    >
      <div className={cn(
        'px-3 py-2 border-b border-slate-100 text-center',
        isToday && 'bg-blue-50'
      )}>
        <p className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          isToday ? 'text-blue-700' : 'text-slate-500'
        )}>
          {dayName}
        </p>
        <p className={cn(
          'text-sm font-bold',
          isToday ? 'text-blue-800' : 'text-slate-700'
        )}>
          {dayNum}
        </p>
        {totalSeconds > 0 && (
          <p className="text-xs text-slate-400">{formatTime(totalSeconds)}</p>
        )}
      </div>
      <div className="flex-1 p-2 space-y-1.5 overflow-y-auto max-h-64">
        {tasks.length === 0 ? (
          <p className="text-xs text-slate-300 text-center py-4">Vazio</p>
        ) : (
          tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onTaskClick(task.id)}
              className={cn(
                'w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-slate-50 transition-colors border border-slate-100',
                task.status === 'finalizada' && 'opacity-50 line-through'
              )}
            >
              <span className="truncate block text-slate-700">{task.name}</span>
              {task.due_date && <DueDateBadge dueDate={task.due_date} className="mt-0.5" />}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ===================== TodayPage =====================

export function TodayPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'today' | 'week'>('today')
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [weekSchedule, setWeekSchedule] = useState<{ date: string; tasks: Task[] }[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const [dayTasks, weekData] = await Promise.all([
        window.api.getTasksForDate(today),
        window.api.getWeeklySchedule(today)
      ])
      setTodayTasks(dayTasks)
      setWeekSchedule(weekData)
    } catch (err) {
      console.error('Erro ao carregar dados do dia:', err)
    } finally {
      setLoading(false)
    }
  }, [today])

  useEffect(() => {
    loadData()
  }, [loadData])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent): Promise<void> => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = todayTasks.findIndex((t) => t.id === active.id)
      const newIndex = todayTasks.findIndex((t) => t.id === over.id)
      const reordered = arrayMove(todayTasks, oldIndex, newIndex)

      setTodayTasks(reordered)

      // Persist order
      await Promise.all(
        reordered.map((task, index) => window.api.updateDayOrder(task.id, index))
      )
    },
    [todayTasks]
  )

  // Time estimates
  const totalLimitSeconds = todayTasks.reduce((acc, t) => acc + (t.time_limit_seconds || 0), 0)
  const totalLimitHours = totalLimitSeconds / 3600
  const WORK_DAY_HOURS = 8
  const loadPercent = Math.min((totalLimitHours / WORK_DAY_HOURS) * 100, 100)
  const isOverloaded = totalLimitHours > WORK_DAY_HOURS
  const completedCount = todayTasks.filter((t) => t.status === 'finalizada').length

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Header — mesmo padrão de SingleTaskPage */}
      <header className="shrink-0 px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={18} className="mr-1" />
          Voltar
        </button>

        <div className="flex items-center gap-3">
          <CalendarDays size={20} className="text-blue-600" />
          <div>
            <span className="text-lg font-bold text-slate-900">Hoje</span>
            <span className="ml-2 text-sm text-slate-500">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long'
              })}
            </span>
          </div>
        </div>

        {/* Load indicator */}
        {tab === 'today' && totalLimitSeconds > 0 && (
            <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
              <Clock size={16} className={isOverloaded ? 'text-red-500' : 'text-green-500'} />
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-sm font-bold',
                    isOverloaded ? 'text-red-600' : 'text-green-600'
                  )}>
                    {formatTime(totalLimitSeconds)}
                  </span>
                  <span className="text-xs text-slate-400">/ {WORK_DAY_HOURS}h</span>
                  {isOverloaded && <AlertTriangle size={14} className="text-red-500" />}
                </div>
                <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      isOverloaded ? 'bg-red-500' : 'bg-green-500'
                    )}
                    style={{ width: `${loadPercent}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {completedCount}/{todayTasks.length} feitas
              </div>
            </div>
          )}
      </header>

      {/* Tabs */}
      <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-2 shrink-0">
          <button
            onClick={() => setTab('today')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
              tab === 'today'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            )}
          >
            <CalendarDays size={14} />
            Hoje
            {todayTasks.length > 0 && (
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                tab === 'today' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              )}>
                {todayTasks.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('week')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
              tab === 'week'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            )}
          >
            <Calendar size={14} />
            Esta Semana
          </button>
        </div>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-6 pt-3 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              Carregando...
            </div>
          ) : tab === 'today' ? (
            <>
              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <CalendarDays size={40} className="mb-3 text-slate-300" />
                  <p className="text-lg font-medium">Nenhuma tarefa programada para hoje</p>
                  <p className="text-sm mt-1">
                    Use o botão 📅 nas tarefas para programá-las para hoje.
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={todayTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2 max-w-2xl">
                      {todayTasks.map((task) => (
                        <SortableTaskRow
                          key={task.id}
                          task={task}
                          onTaskClick={(id) => navigate(`/task/${id}`)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </>
          ) : (
            /* Weekly view */
            <div className="flex gap-3 overflow-x-auto pb-4">
              {weekSchedule.map(({ date, tasks }) => (
                <DayColumn
                  key={date}
                  date={date}
                  tasks={tasks}
                  isToday={date === today}
                  onTaskClick={(id) => navigate(`/task/${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
