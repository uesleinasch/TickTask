import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@renderer/components/ui/button'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  Activity,
  Target,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Flag,
  Circle
} from 'lucide-react'
import { formatTime } from '@renderer/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

interface DailyStats {
  date: string
  dayOfWeek: number
  totalSeconds: number
}

interface TaskTimeStats {
  taskId: number
  taskName: string
  totalSeconds: number
}

interface StatusStats {
  status: string
  totalSeconds: number
}

interface HeatmapData {
  date: string
  count: number
}

interface CategoryStats {
  category: string
  totalSeconds: number
  taskCount: number
}

interface GeneralStats {
  totalTasks: number
  completedTasks: number
  totalTimeSeconds: number
  totalSessions: number
  avgSessionSeconds: number
}

const STATUS_COLORS: Record<string, string> = {
  inbox: '#94a3b8',
  aguardando: '#f59e0b',
  proximas: '#3b82f6',
  executando: '#22c55e',
  finalizada: '#10b981'
}

const STATUS_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  aguardando: 'Aguardando',
  proximas: 'Próximas',
  executando: 'Executando',
  finalizada: 'Finalizada'
}

const CATEGORY_COLORS: Record<string, string> = {
  urgente: '#ef4444',
  prioridade: '#f59e0b',
  normal: '#3b82f6',
  time_leak: '#a855f7'
}

const CATEGORY_LABELS: Record<string, string> = {
  urgente: 'Urgente',
  prioridade: 'Prioridade',
  normal: 'Normal',
  time_leak: 'Time Leak'
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const CHART_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#84cc16'
]

export function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([])
  const [taskTimeStats, setTaskTimeStats] = useState<TaskTimeStats[]>([])
  const [statusStats, setStatusStats] = useState<StatusStats[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([])
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats(): Promise<void> {
      try {
        const [weekly, taskTime, status, category, heatmap, general] = await Promise.all([
          window.api.getWeeklyStats(),
          window.api.getTaskTimeStats(),
          window.api.getStatusStats(),
          window.api.getCategoryStats(),
          window.api.getHeatmapData(),
          window.api.getGeneralStats()
        ])

        setWeeklyStats(weekly)
        setTaskTimeStats(taskTime)
        setStatusStats(status)
        setCategoryStats(category)
        setHeatmapData(heatmap)
        setGeneralStats(general)
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  // Agrupar dados por dia da semana
  const weekdayData = useMemo(() => {
    const grouped = WEEKDAY_LABELS.map((label, index) => ({
      name: label,
      dayOfWeek: index,
      totalSeconds: 0,
      hours: 0
    }))

    weeklyStats.forEach((stat) => {
      const dayIndex = parseInt(stat.dayOfWeek.toString())
      if (grouped[dayIndex]) {
        grouped[dayIndex].totalSeconds += stat.totalSeconds
        grouped[dayIndex].hours = Number((grouped[dayIndex].totalSeconds / 3600).toFixed(1))
      }
    })

    return grouped
  }, [weeklyStats])

  // Dados para o gráfico de pizza (status)
  const statusPieData = useMemo(() => {
    return statusStats.map((stat) => ({
      name: STATUS_LABELS[stat.status] || stat.status,
      value: Math.round(stat.totalSeconds / 60), // converter para minutos
      color: STATUS_COLORS[stat.status] || '#94a3b8'
    }))
  }, [statusStats])

  // Dados para o gráfico de pizza (tarefas)
  const taskPieData = useMemo(() => {
    return taskTimeStats.slice(0, 6).map((stat, index) => ({
      name: stat.taskName.length > 15 ? stat.taskName.substring(0, 15) + '...' : stat.taskName,
      value: Math.round(stat.totalSeconds / 60), // converter para minutos
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))
  }, [taskTimeStats])

  // Dados para o gráfico de pizza (categorias)
  const categoryPieData = useMemo(() => {
    return categoryStats.map((stat) => ({
      name: CATEGORY_LABELS[stat.category] || stat.category,
      value: Math.round(stat.totalSeconds / 60), // converter para minutos
      taskCount: stat.taskCount,
      color: CATEGORY_COLORS[stat.category] || '#94a3b8'
    }))
  }, [categoryStats])

  // Gerar dados do heatmap
  const heatmapGrid = useMemo(() => {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setFullYear(startDate.getFullYear() - 1)
    startDate.setDate(startDate.getDate() - startDate.getDay()) // Ajustar para domingo

    const weeks: { date: Date; count: number }[][] = []
    const heatmapMap = new Map(heatmapData.map((d) => [d.date, d.count]))

    let currentWeek: { date: Date; count: number }[] = []
    const current = new Date(startDate)

    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0]
      const count = heatmapMap.get(dateStr) || 0

      currentWeek.push({
        date: new Date(current),
        count: Math.min(count / 3600, 8) // Normalizar para horas (max 8h)
      })

      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }

      current.setDate(current.getDate() + 1)
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return weeks
  }, [heatmapData])

  const getHeatmapColor = (value: number): string => {
    if (value === 0) return 'bg-slate-100'
    if (value < 1) return 'bg-emerald-200'
    if (value < 2) return 'bg-emerald-300'
    if (value < 4) return 'bg-emerald-400'
    if (value < 6) return 'bg-emerald-500'
    return 'bg-emerald-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-400">Carregando estatísticas...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      {/* Header */}
      <header className="shrink-0 px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent"
          >
            <ArrowLeft size={18} className="mr-2" /> Voltar
          </Button>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={24} className="text-emerald-600" />
            Dashboard de Estatísticas
          </h1>
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="max-w-6xl mx-auto p-6 pb-16 space-y-6">
          {/* Stats Cards */}
          {generalStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{generalStats.totalTasks}</p>
                    <p className="text-xs text-slate-500">Total de Tarefas</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle size={20} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {generalStats.completedTasks}
                    </p>
                    <p className="text-xs text-slate-500">Concluídas</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Clock size={20} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatTime(generalStats.totalTimeSeconds)}
                    </p>
                    <p className="text-xs text-slate-500">Tempo Total</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Activity size={20} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {generalStats.totalSessions}
                    </p>
                    <p className="text-xs text-slate-500">Sessões</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart - Tempo por dia da semana */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-blue-600" />
                Tempo Focado por Dia da Semana
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weekdayData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} unit="h" />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}h`, 'Horas']}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart - Por Status */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Tempo por Status</h3>
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} min`, 'Tempo']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400">
                  Sem dados disponíveis
                </div>
              )}
            </div>
          </div>

          {/* Categoria Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart - Por Categoria */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                Tempo por Categoria
              </h3>
              {categoryPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} min`, 'Tempo']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400">
                  Sem dados disponíveis
                </div>
              )}
            </div>

            {/* Category Details */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Flag size={20} className="text-amber-500" />
                Detalhes por Categoria
              </h3>
              {categoryStats.length > 0 ? (
                <div className="space-y-4">
                  {categoryStats.map((cat) => {
                    const Icon =
                      cat.category === 'urgente'
                        ? AlertTriangle
                        : cat.category === 'prioridade'
                          ? Flag
                          : cat.category === 'time_leak'
                            ? Clock
                            : Circle

                    return (
                      <div
                        key={cat.category}
                        className="flex items-center gap-4 p-3 rounded-lg bg-slate-50"
                      >
                        <div
                          className="p-2 rounded-lg"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[cat.category]}20`
                          }}
                        >
                          <Icon size={20} style={{ color: CATEGORY_COLORS[cat.category] }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {CATEGORY_LABELS[cat.category] || cat.category}
                          </p>
                          <p className="text-xs text-slate-500">
                            {cat.taskCount} tarefa{cat.taskCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-medium text-slate-900">
                            {formatTime(cat.totalSeconds)}
                          </p>
                          <p className="text-xs text-slate-500">tempo total</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400">
                  Sem dados disponíveis
                </div>
              )}
            </div>
          </div>

          {/* Pie Chart - Tarefas mais trabalhadas */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Top Tarefas (Tempo Investido)
            </h3>
            {taskPieData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={taskPieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      paddingAngle={1}
                      dataKey="value"
                      label={({ name }) => name}
                      labelLine={false}
                    >
                      {taskPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} min`, 'Tempo']}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Lista de tarefas */}
                <div className="space-y-2">
                  {taskTimeStats.slice(0, 6).map((task, index) => (
                    <div
                      key={task.taskId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="flex-1 text-sm text-slate-700 truncate">
                        {task.taskName}
                      </span>
                      <span className="text-sm font-mono text-slate-500">
                        {formatTime(task.totalSeconds)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-slate-400">
                Sem dados disponíveis
              </div>
            )}
          </div>

          {/* Heatmap */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar size={20} className="text-emerald-600" />
              Contribuições no Último Ano
            </h3>

            <div className="overflow-x-auto">
              <div className="flex gap-0.5 min-w-max">
                {heatmapGrid.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-0.5">
                    {week.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className={`w-3 h-3 rounded-sm ${getHeatmapColor(day.count)}`}
                        title={`${day.date.toLocaleDateString('pt-BR')}: ${day.count.toFixed(1)}h`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-500">
              <span>Menos</span>
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-sm bg-slate-100" />
                <div className="w-3 h-3 rounded-sm bg-emerald-200" />
                <div className="w-3 h-3 rounded-sm bg-emerald-300" />
                <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <div className="w-3 h-3 rounded-sm bg-emerald-600" />
              </div>
              <span>Mais</span>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
