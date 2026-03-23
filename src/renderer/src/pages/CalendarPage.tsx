import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
  useDraggable
} from '@dnd-kit/core'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { SearchableSelect } from '@renderer/components/ui/searchable-select'
import { useCalendarWeek, useCalendarMonth } from '@renderer/hooks/useCalendar'
import { useTasks } from '@renderer/hooks/useTasks'
import { useTimerStore } from '@renderer/stores/timerStore'
import type { Task, TimeBlock, CreateTimeBlockInput } from '@shared/types'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  Clock,
  Play,
  Trash2,
  Plus,
  GripVertical
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { toast } from '@renderer/components/ui/sonner'

// ===================== CONSTANTS =====================

const GRID_START_HOUR = 7  // 07:00
const GRID_END_HOUR = 22   // 22:00
const HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => i + GRID_START_HOUR)
const PX_PER_MINUTE = 1.2  // px per minute → 1h = 72px
const GRID_HEIGHT = (GRID_END_HOUR - GRID_START_HOUR) * 60 * PX_PER_MINUTE

const CATEGORY_COLORS: Record<string, string> = {
  urgente: 'bg-red-400 border-red-500',
  prioridade: 'bg-orange-400 border-orange-500',
  normal: 'bg-blue-400 border-blue-500',
  time_leak: 'bg-yellow-400 border-yellow-500'
}

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

// ===================== DATE HELPERS =====================

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}

function dateToStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function strToDate(s: string): Date {
  return new Date(s + 'T12:00:00')
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function getMonthDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days: (Date | null)[] = []
  // Pad start (week starts on Sunday = 0)
  for (let i = 0; i < first.getDay(); i++) days.push(null)
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d))
  // Pad end to complete the last row
  while (days.length % 7 !== 0) days.push(null)
  return days
}

// ===================== TIME BLOCK DIALOG =====================

interface TimeBlockDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreateTimeBlockInput) => Promise<void>
  onDelete?: () => Promise<void>
  tasks: Task[]
  initial?: Partial<TimeBlockDialogState>
  title: string
}

interface TimeBlockDialogState {
  taskId: string
  date: string
  startTime: string
  endTime: string
}

function TimeBlockDialog({
  open, onClose, onSave, onDelete, tasks, initial, title
}: TimeBlockDialogProps): React.JSX.Element {
  const [taskId, setTaskId] = useState(initial?.taskId || '')
  const [date, setDate] = useState(initial?.date || dateToStr(new Date()))
  const [startTime, setStartTime] = useState(initial?.startTime || '09:00')
  const [endTime, setEndTime] = useState(initial?.endTime || '10:00')

  useEffect(() => {
    if (open) {
      setTaskId(initial?.taskId || '')
      setDate(initial?.date || dateToStr(new Date()))
      setStartTime(initial?.startTime || '09:00')
      setEndTime(initial?.endTime || '10:00')
    }
  }, [open, initial?.taskId, initial?.date, initial?.startTime, initial?.endTime])

  const activeTasks = tasks.filter((t) => !t.is_archived && t.status !== 'finalizada')

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!taskId) return
      if (startTime >= endTime) {
        toast.error('Hora de início deve ser anterior ao fim.')
        return
      }
      await onSave({ task_id: Number(taskId), date, start_time: startTime, end_time: endTime })
      onClose()
    },
    [taskId, date, startTime, endTime, onSave, onClose]
  )

  const durationMin = endTime > startTime
    ? timeToMinutes(endTime) - timeToMinutes(startTime)
    : 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md w-full">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 min-w-0 w-full">
          <div className="min-w-0 w-full">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tarefa *</label>
            <SearchableSelect
              value={taskId}
              onChange={setTaskId}
              options={activeTasks.map((t) => ({ value: String(t.id), label: t.name }))}
              placeholder="Selecione uma tarefa..."
              searchPlaceholder="Buscar tarefa..."
              className="w-full min-w-0"
            />
          </div>
          <div className="min-w-0 w-full">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Data *</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <div className="min-w-0">
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Início *</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full" />
            </div>
            <div className="min-w-0">
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Fim *</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full" />
            </div>
          </div>
          {durationMin > 0 && (
            <p className="text-xs text-slate-500">
              Duração: {Math.floor(durationMin / 60)}h {durationMin % 60 > 0 ? `${durationMin % 60}min` : ''}
            </p>
          )}
          <DialogFooter className="gap-2">
            {onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 mr-auto"
                onClick={async () => { await onDelete(); onClose() }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            )}
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!taskId}>Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ===================== DRAGGABLE TASK CHIP (Monthly) =====================

interface DraggableTaskChipProps {
  task: Task
  onNavigate: (id: number) => void
}

function DraggableTaskChip({ task, onNavigate }: DraggableTaskChipProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `task-${task.id}` })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onNavigate(task.id) }}
      className={cn(
        'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs cursor-grab active:cursor-grabbing select-none',
        'bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 transition-colors',
        isDragging && 'opacity-40'
      )}
    >
      <GripVertical className="h-2.5 w-2.5 text-blue-400 shrink-0" />
      <span className="truncate">{task.name}</span>
    </div>
  )
}

// ===================== DROPPABLE DAY CELL (Monthly) =====================

interface DroppableDayCellProps {
  date: Date
  tasks: Task[]
  timeBlockCount: number
  isToday: boolean
  isCurrentMonth: boolean
  onNavigate: (taskId: number) => void
  onDayClick: (date: string) => void
}

function DroppableDayCell({
  date, tasks, timeBlockCount, isToday, isCurrentMonth, onNavigate, onDayClick
}: DroppableDayCellProps): React.JSX.Element {
  const dateStr = dateToStr(date)
  const { setNodeRef, isOver } = useDroppable({ id: `day-${dateStr}` })

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDayClick(dateStr)}
      className={cn(
        'min-h-[90px] p-1.5 border border-slate-200 cursor-pointer transition-colors',
        isToday && 'bg-blue-50 border-blue-300',
        !isCurrentMonth && 'bg-slate-50 opacity-50',
        isOver && 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300'
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={cn(
          'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full',
          isToday ? 'bg-blue-500 text-white' : 'text-slate-600'
        )}>
          {date.getDate()}
        </span>
        {timeBlockCount > 0 && (
          <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">
            {timeBlockCount}⏱
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        {tasks.slice(0, 3).map((t) => (
          <DraggableTaskChip key={t.id} task={t} onNavigate={onNavigate} />
        ))}
        {tasks.length > 3 && (
          <span className="text-xs text-slate-400 pl-1">+{tasks.length - 3} mais</span>
        )}
      </div>
    </div>
  )
}

// ===================== TIME BLOCK CARD (Weekly grid) =====================

interface TimeBlockCardProps {
  block: TimeBlock
  onClick: (block: TimeBlock) => void
  onStartTimer: (block: TimeBlock) => void
}

function TimeBlockCard({ block, onClick, onStartTimer }: TimeBlockCardProps): React.JSX.Element {
  const startMin = timeToMinutes(block.start_time)
  const endMin = timeToMinutes(block.end_time)
  const gridStartMin = GRID_START_HOUR * 60
  const top = (startMin - gridStartMin) * PX_PER_MINUTE
  const height = Math.max((endMin - startMin) * PX_PER_MINUTE, 20)
  const colorClass = CATEGORY_COLORS[block.task_category || 'normal']
  const durationMin = endMin - startMin

  return (
    <div
      className={cn(
        'absolute left-0.5 right-0.5 rounded border text-white text-xs overflow-hidden cursor-pointer hover:opacity-90 transition-opacity group z-10',
        colorClass
      )}
      style={{ top: `${top}px`, height: `${height}px` }}
      onClick={(e) => { e.stopPropagation(); onClick(block) }}
    >
      <div className="px-1.5 pt-0.5 h-full flex flex-col">
        <span className="font-semibold truncate leading-tight">{block.task_name}</span>
        {height > 30 && (
          <span className="opacity-80 text-[10px]">
            {block.start_time}–{block.end_time}
            {durationMin >= 60 && ` (${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? durationMin % 60 + 'min' : ''})`}
          </span>
        )}
        {height > 50 && (
          <button
            className="mt-auto mb-0.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] bg-white/20 hover:bg-white/40 rounded px-1 py-0.5 w-fit"
            onClick={(e) => { e.stopPropagation(); onStartTimer(block) }}
          >
            <Play className="h-2.5 w-2.5" />
            Timer
          </button>
        )}
      </div>
    </div>
  )
}

// ===================== WEEKLY TIME GRID =====================

interface WeeklyTimeGridProps {
  weekDates: string[]
  weekSchedule: { date: string; tasks: Task[] }[]
  timeBlocks: TimeBlock[]
  onSlotClick: (date: string, time: string) => void
  onBlockClick: (block: TimeBlock) => void
  onBlockTimerStart: (block: TimeBlock) => void
  onTaskClick: (id: number) => void
}

function WeeklyTimeGrid({
  weekDates, weekSchedule, timeBlocks, onSlotClick, onBlockClick, onBlockTimerStart, onTaskClick
}: WeeklyTimeGridProps): React.JSX.Element {
  const today = dateToStr(new Date())
  const nowRef = useRef<HTMLDivElement>(null)
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const nowTop = (nowMin - GRID_START_HOUR * 60) * PX_PER_MINUTE
  const showNowLine = nowMin >= GRID_START_HOUR * 60 && nowMin <= GRID_END_HOUR * 60

  useEffect(() => {
    nowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  function getBlocksForDay(date: string): TimeBlock[] {
    return timeBlocks.filter((b) => b.date === date)
  }

  function handleGridClick(e: React.MouseEvent<HTMLDivElement>, date: string): void {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const minuteFromGrid = y / PX_PER_MINUTE
    const totalMinute = GRID_START_HOUR * 60 + minuteFromGrid
    const snapped = Math.round(totalMinute / 30) * 30
    const clampedStart = Math.min(Math.max(snapped, GRID_START_HOUR * 60), (GRID_END_HOUR - 1) * 60)
    const clampedEnd = Math.min(clampedStart + 60, GRID_END_HOUR * 60)
    onSlotClick(date, `${minutesToTime(clampedStart)}-${minutesToTime(clampedEnd)}`)
  }

  return (
    <div className="flex flex-col h-full">
      {/* All-day row */}
      <div className="flex shrink-0 border-b border-slate-200 bg-white">
        <div className="w-14 shrink-0 border-r border-slate-200 py-2 text-center">
          <span className="text-xs text-slate-400">Dia</span>
        </div>
        {weekDates.map((date) => {
          const dayData = weekSchedule.find((d) => d.date === date)
          const dayTasks = dayData?.tasks || []
          const d = strToDate(date)
          const isToday = date === today
          return (
            <div
              key={date}
              className={cn(
                'flex-1 border-r border-slate-200 px-1 py-1 min-w-0',
                isToday && 'bg-blue-50'
              )}
            >
              <div className="text-center mb-1">
                <span className={cn(
                  'text-xs font-semibold',
                  isToday ? 'text-blue-700' : 'text-slate-500'
                )}>
                  {DAY_NAMES[d.getDay()]}
                </span>
                <div className={cn(
                  'text-xs font-bold w-6 h-6 mx-auto flex items-center justify-center rounded-full',
                  isToday ? 'bg-blue-500 text-white' : 'text-slate-700'
                )}>
                  {d.getDate()}
                </div>
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 2).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onTaskClick(t.id)}
                    className="w-full text-left px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-800 hover:bg-blue-200 truncate block"
                  >
                    {t.name}
                  </button>
                ))}
                {dayTasks.length > 2 && (
                  <span className="text-xs text-slate-400 pl-1">+{dayTasks.length - 2}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="flex flex-1 overflow-auto">
        {/* Hour labels */}
        <div className="w-14 shrink-0 border-r border-slate-200 bg-white relative" style={{ height: `${GRID_HEIGHT}px` }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute w-full text-right pr-2"
              style={{ top: `${(h - GRID_START_HOUR) * 60 * PX_PER_MINUTE - 8}px` }}
            >
              <span className="text-xs text-slate-400">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map((date) => {
          const isToday = date === today
          const dayBlocks = getBlocksForDay(date)
          return (
            <div
              key={date}
              className={cn(
                'flex-1 border-r border-slate-200 relative cursor-crosshair',
                isToday && 'bg-blue-50/30'
              )}
              style={{ height: `${GRID_HEIGHT}px` }}
              onClick={(e) => handleGridClick(e, date)}
            >
              {/* Hour lines */}
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-slate-100"
                  style={{ top: `${(h - GRID_START_HOUR) * 60 * PX_PER_MINUTE}px` }}
                />
              ))}
              {/* Half-hour lines */}
              {HOURS.map((h) => (
                <div
                  key={`half-${h}`}
                  className="absolute left-0 right-0 border-t border-slate-50"
                  style={{ top: `${(h - GRID_START_HOUR) * 60 * PX_PER_MINUTE + 30 * PX_PER_MINUTE}px` }}
                />
              ))}

              {/* Now line */}
              {isToday && showNowLine && (
                <div
                  ref={nowRef}
                  className="absolute left-0 right-0 border-t-2 border-red-400 z-20 pointer-events-none"
                  style={{ top: `${nowTop}px` }}
                >
                  <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-400" />
                </div>
              )}

              {/* Time blocks */}
              {dayBlocks.map((block) => (
                <TimeBlockCard
                  key={block.id}
                  block={block}
                  onClick={onBlockClick}
                  onStartTimer={onBlockTimerStart}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ===================== MONTHLY CALENDAR GRID =====================

interface MonthlyCalendarProps {
  year: number
  month: number
  scheduledTasks: Task[]
  timeBlocks: TimeBlock[]
  onTaskNavigate: (id: number) => void
  onDayClick: (date: string) => void
  onDragEnd: (taskId: number, newDate: string) => void
}

function MonthlyCalendar({
  year, month, scheduledTasks, timeBlocks, onTaskNavigate, onDayClick, onDragEnd
}: MonthlyCalendarProps): React.JSX.Element {
  const today = dateToStr(new Date())
  const days = getMonthDays(year, month)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  function getTasksForDay(date: Date): Task[] {
    const ds = dateToStr(date)
    return scheduledTasks.filter((t) => t.scheduled_date === ds)
  }

  function getBlockCountForDay(date: Date): number {
    const ds = dateToStr(date)
    return timeBlocks.filter((b) => b.date === ds).length
  }

  function handleDragStart(event: DragStartEvent): void {
    const id = Number(String(event.active.id).replace('task-', ''))
    setActiveTask(scheduledTasks.find((t) => t.id === id) || null)
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return
    const taskId = Number(String(active.id).replace('task-', ''))
    const newDate = String(over.id).replace('day-', '')
    if (newDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      onDragEnd(taskId, newDate)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {d}
            </div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 flex-1">
          {days.map((date, idx) =>
            date === null ? (
              <div key={`empty-${idx}`} className="min-h-[90px] bg-slate-50/50 border border-slate-100" />
            ) : (
              <DroppableDayCell
                key={dateToStr(date)}
                date={date}
                tasks={getTasksForDay(date)}
                timeBlockCount={getBlockCountForDay(date)}
                isToday={dateToStr(date) === today}
                isCurrentMonth={date.getMonth() === month}
                onNavigate={onTaskNavigate}
                onDayClick={onDayClick}
              />
            )
          )}
        </div>
      </div>
      {/* Drag overlay hint */}
      {activeTask && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg pointer-events-none">
          Solte em um dia para reagendar
        </div>
      )}
    </DndContext>
  )
}

// ===================== MAIN CALENDAR PAGE =====================

type CalendarView = 'month' | 'week'

export function CalendarPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { tasks } = useTasks()
  const { startTimer } = useTimerStore()

  const [view, setView] = useState<CalendarView>('week')

  // Week navigation
  const [weekStartDate, setWeekStartDate] = useState(() => dateToStr(getWeekStart(new Date())))

  // Month navigation
  const todayD = new Date()
  const [month, setMonth] = useState(todayD.getMonth())
  const [year, setYear] = useState(todayD.getFullYear())
  const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`

  const weekData = useCalendarWeek(weekStartDate)
  const monthData = useCalendarMonth(yearMonth)

  // Week dates array
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStartDate + 'T12:00:00')
    d.setDate(d.getDate() + i)
    return dateToStr(d)
  })

  // Dialog state
  const [blockDialog, setBlockDialog] = useState<{
    open: boolean
    block?: TimeBlock
    initial?: Partial<{ taskId: string; date: string; startTime: string; endTime: string }>
  }>({ open: false })

  // Navigation
  function prevPeriod(): void {
    if (view === 'week') {
      const d = new Date(weekStartDate + 'T12:00:00')
      d.setDate(d.getDate() - 7)
      setWeekStartDate(dateToStr(d))
    } else {
      if (month === 0) { setMonth(11); setYear(y => y - 1) }
      else setMonth(m => m - 1)
    }
  }

  function nextPeriod(): void {
    if (view === 'week') {
      const d = new Date(weekStartDate + 'T12:00:00')
      d.setDate(d.getDate() + 7)
      setWeekStartDate(dateToStr(d))
    } else {
      if (month === 11) { setMonth(0); setYear(y => y + 1) }
      else setMonth(m => m + 1)
    }
  }

  function goToToday(): void {
    const now = new Date()
    setWeekStartDate(dateToStr(getWeekStart(now)))
    setMonth(now.getMonth())
    setYear(now.getFullYear())
  }

  // Period label
  function periodLabel(): string {
    if (view === 'week') {
      const end = new Date(weekStartDate + 'T12:00:00')
      end.setDate(end.getDate() + 6)
      const start = strToDate(weekStartDate)
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()}–${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`
      }
      return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`
    }
    return `${MONTH_NAMES[month]} ${year}`
  }

  // Time block handlers
  const handleSlotClick = useCallback((date: string, timeRange: string): void => {
    const [start, end] = timeRange.split('-')
    setBlockDialog({ open: true, initial: { date, startTime: start, endTime: end } })
  }, [])

  const handleBlockClick = useCallback((block: TimeBlock): void => {
    setBlockDialog({
      open: true,
      block,
      initial: {
        taskId: String(block.task_id),
        date: block.date,
        startTime: block.start_time,
        endTime: block.end_time
      }
    })
  }, [])

  const handleBlockTimerStart = useCallback(async (block: TimeBlock): Promise<void> => {
    try {
      await startTimer(block.task_id)
      toast.success(`Timer iniciado: ${block.task_name}`)
    } catch (error) {
      toast.error('Não foi possível iniciar o timer.')
      console.error(error)
    }
  }, [startTimer])

  const handleSaveBlock = useCallback(async (data: CreateTimeBlockInput): Promise<void> => {
    if (blockDialog.block) {
      await weekData.updateTimeBlock(blockDialog.block.id, data)
      toast.success('Bloco atualizado!')
    } else {
      await weekData.createTimeBlock(data)
      toast.success('Bloco criado!')
    }
    await monthData.refresh()
  }, [blockDialog.block, weekData, monthData])

  const handleDeleteBlock = useCallback(async (): Promise<void> => {
    if (blockDialog.block) {
      await weekData.deleteTimeBlock(blockDialog.block.id)
      await monthData.refresh()
      toast.success('Bloco removido.')
    }
  }, [blockDialog.block, weekData, monthData])

  const handleDayClick = useCallback((date: string): void => {
    setBlockDialog({ open: true, initial: { date } })
  }, [])

  const handleMonthDragEnd = useCallback(async (taskId: number, newDate: string): Promise<void> => {
    await monthData.scheduleTask(taskId, newDate)
    await weekData.refresh()
    toast.success('Tarefa reagendada!')
  }, [monthData, weekData])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="shrink-0 px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="h-8 px-2 text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h1 className="text-base font-semibold text-slate-900">Calendário</h1>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday} className="h-8 text-xs">
            Hoje
          </Button>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={prevPeriod} className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 min-w-[200px] text-center">
              {periodLabel()}
            </span>
            <Button variant="ghost" size="sm" onClick={nextPeriod} className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* View toggle + New block */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView('month')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'month' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <Calendar className="inline h-3.5 w-3.5 mr-1" />
              Mês
            </button>
            <button
              onClick={() => setView('week')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-colors',
                view === 'week' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <CalendarDays className="inline h-3.5 w-3.5 mr-1" />
              Semana
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => setBlockDialog({ open: true })}
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Bloco
          </Button>
        </div>
      </header>

      {/* Calendar body */}
      <div className="flex-1 overflow-hidden">
        {view === 'week' ? (
          <div className="h-full overflow-auto">
            <WeeklyTimeGrid
              weekDates={weekDates}
              weekSchedule={weekData.weekSchedule}
              timeBlocks={weekData.timeBlocks}
              onSlotClick={handleSlotClick}
              onBlockClick={handleBlockClick}
              onBlockTimerStart={handleBlockTimerStart}
              onTaskClick={(id) => navigate(`/task/${id}`)}
            />
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <MonthlyCalendar
              year={year}
              month={month}
              scheduledTasks={monthData.scheduledTasks}
              timeBlocks={monthData.timeBlocks}
              onTaskNavigate={(id) => navigate(`/task/${id}`)}
              onDayClick={handleDayClick}
              onDragEnd={handleMonthDragEnd}
            />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="shrink-0 px-4 py-2 bg-white border-t border-slate-200 flex items-center gap-4">
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" />
            Agendado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-400 inline-block" />
            Bloco normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-orange-400 inline-block" />
            Bloco urgente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-red-400 inline-block" />
            Agora
          </span>
          {view === 'week' && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="h-3 w-3" />
              Clique na grade para criar bloco
            </span>
          )}
          {view === 'month' && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <GripVertical className="h-3 w-3" />
              Arraste tarefas entre dias
            </span>
          )}
        </div>
      </div>

      {/* Time Block Dialog */}
      <TimeBlockDialog
        open={blockDialog.open}
        onClose={() => setBlockDialog({ open: false })}
        onSave={handleSaveBlock}
        onDelete={blockDialog.block ? handleDeleteBlock : undefined}
        tasks={tasks}
        initial={blockDialog.initial}
        title={blockDialog.block ? 'Editar Bloco de Tempo' : 'Novo Bloco de Tempo'}
      />
    </div>
  )
}
