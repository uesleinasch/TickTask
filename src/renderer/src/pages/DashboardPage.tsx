import { useState, useEffect, useMemo, useCallback } from 'react'
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
  Circle,
  Zap,
  FileDown,
  InboxIcon,
  Timer,
  FolderX,
  Hourglass
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
  Legend,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts'
import type { GtdMetrics, EnergyStats } from '@shared/types'
import { ENERGY_LABELS, ENERGY_COLORS, ENERGY_ICONS } from '@shared/types'
import { toast } from '@renderer/components/ui/sonner'
import { cn } from '@renderer/lib/utils'
import { RunningNowPanel } from '@renderer/components/RunningNowPanel'

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
  finalizada: '#10b981',
  someday: '#14b8a6'
}

const STATUS_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  aguardando: 'Aguardando',
  proximas: 'Próximas',
  executando: 'Executando',
  finalizada: 'Finalizada',
  someday: 'Someday'
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

// Flow order for funnel
const FLOW_ORDER = ['inbox', 'proximas', 'executando', 'aguardando', 'finalizada', 'someday']
const FLOW_COLORS = ['#94a3b8', '#3b82f6', '#22c55e', '#f59e0b', '#10b981', '#14b8a6']

export function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([])
  const [taskTimeStats, setTaskTimeStats] = useState<TaskTimeStats[]>([])
  const [statusStats, setStatusStats] = useState<StatusStats[]>([])
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([])
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([])
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null)
  const [gtdMetrics, setGtdMetrics] = useState<GtdMetrics | null>(null)
  const [energyStats, setEnergyStats] = useState<EnergyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    async function loadStats(): Promise<void> {
      try {
        const [weekly, taskTime, status, category, heatmap, general, gtd, energy] =
          await Promise.all([
            window.api.getWeeklyStats(),
            window.api.getTaskTimeStats(),
            window.api.getStatusStats(),
            window.api.getCategoryStats(),
            window.api.getHeatmapData(),
            window.api.getGeneralStats(),
            window.api.getGtdMetrics(),
            window.api.getEnergyStats()
          ])

        setWeeklyStats(weekly)
        setTaskTimeStats(taskTime)
        setStatusStats(status)
        setCategoryStats(category)
        setHeatmapData(heatmap)
        setGeneralStats(general)
        setGtdMetrics(gtd)
        setEnergyStats(energy)
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [])

  const handleGeneratePDF = useCallback(async () => {
    setPdfLoading(true)
    try {
      await window.api.generateWeeklyPDF()
      toast.success('Relatório gerado com sucesso!')
    } catch {
      toast.error('Erro ao gerar relatório PDF.')
    } finally {
      setPdfLoading(false)
    }
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
      value: Math.round(stat.totalSeconds / 60),
      color: STATUS_COLORS[stat.status] || '#94a3b8'
    }))
  }, [statusStats])

  // Dados para o gráfico de pizza (tarefas)
  const taskPieData = useMemo(() => {
    return taskTimeStats.slice(0, 6).map((stat, index) => ({
      name: stat.taskName.length > 15 ? stat.taskName.substring(0, 15) + '...' : stat.taskName,
      value: Math.round(stat.totalSeconds / 60),
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))
  }, [taskTimeStats])

  // Dados para o gráfico de pizza (categorias)
  const categoryPieData = useMemo(() => {
    return categoryStats.map((stat) => ({
      name: CATEGORY_LABELS[stat.category] || stat.category,
      value: Math.round(stat.totalSeconds / 60),
      taskCount: stat.taskCount,
      color: CATEGORY_COLORS[stat.category] || '#94a3b8'
    }))
  }, [categoryStats])

  // Funnel de fluxo de tarefas
  const taskFlowData = useMemo(() => {
    if (!gtdMetrics) return []
    return FLOW_ORDER.filter((s) => (gtdMetrics.taskFlowCounts[s] || 0) > 0).map((s, i) => ({
      name: STATUS_LABELS[s] || s,
      value: gtdMetrics.taskFlowCounts[s] || 0,
      fill: FLOW_COLORS[i % FLOW_COLORS.length]
    }))
  }, [gtdMetrics])

  // Dados de energia para gráfico
  const energyChartData = useMemo(() => {
    return energyStats.map((e) => ({
      name: ENERGY_LABELS[e.energy_level],
      horas: Number((e.totalSeconds / 3600).toFixed(1)),
      tarefas: e.taskCount,
      fill: ENERGY_COLORS[e.energy_level]
    }))
  }, [energyStats])

  // Gerar dados do heatmap
  const heatmapGrid = useMemo(() => {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setFullYear(startDate.getFullYear() - 1)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    const weeks: { date: Date; count: number }[][] = []
    const heatmapMap = new Map(heatmapData.map((d) => [d.date, d.count]))

    let currentWeek: { date: Date; count: number }[] = []
    const current = new Date(startDate)

    while (current <= today) {
      const dateStr = current.toISOString().split('T')[0]
      const count = heatmapMap.get(dateStr) || 0

      currentWeek.push({
        date: new Date(current),
        count: Math.min(count / 3600, 8)
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

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`
    return `${(seconds / 3600).toFixed(1)}h`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <p className="text-slate-400">Carregando estatísticas...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
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
            Dashboard Avançado
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGeneratePDF}
          disabled={pdfLoading}
          className="h-9 border-slate-200 gap-2"
        >
          <FileDown size={16} />
          {pdfLoading ? 'Gerando...' : 'Exportar PDF'}
        </Button>
      </header>

      <ScrollArea className="flex-1 h-0">
        <div className="max-w-6xl mx-auto p-6 pb-16 space-y-6">

          {/* Timers em execução (só aparece se houver algum) */}
          <RunningNowPanel />

          {/* ==================== STATS CARDS ==================== */}
          {generalStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Target size={20} className="text-blue-600" />}
                iconBg="bg-blue-100"
                value={generalStats.totalTasks}
                label="Total de Tarefas"
              />
              <StatCard
                icon={<CheckCircle size={20} className="text-emerald-600" />}
                iconBg="bg-emerald-100"
                value={generalStats.completedTasks}
                label="Concluídas"
              />
              <StatCard
                icon={<Clock size={20} className="text-purple-600" />}
                iconBg="bg-purple-100"
                value={formatTime(generalStats.totalTimeSeconds)}
                label="Tempo Total"
              />
              <StatCard
                icon={<Activity size={20} className="text-orange-600" />}
                iconBg="bg-orange-100"
                value={generalStats.totalSessions}
                label="Sessões"
              />
            </div>
          )}

          {/* ==================== GTD MÉTRICAS ==================== */}
          {gtdMetrics && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
                <Target size={18} className="text-indigo-600" />
                Métricas GTD
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Taxa de conclusão do Inbox */}
                <div className="bg-white border border-slate-200 rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-100 rounded-lg">
                      <InboxIcon size={16} className="text-indigo-600" />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Taxa do Inbox</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{gtdMetrics.inboxCompletionRate}%</p>
                  <p className="text-xs text-slate-400 mt-1">processado esta semana</p>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${gtdMetrics.inboxCompletionRate}%` }}
                    />
                  </div>
                </div>

                {/* Tempo médio de processamento */}
                <div className="bg-white border border-slate-200 rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-teal-100 rounded-lg">
                      <Timer size={16} className="text-teal-600" />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Tempo Médio</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">
                    {formatDuration(gtdMetrics.avgProcessingTimeSeconds)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">da criação à conclusão</p>
                </div>

                {/* Projetos parados */}
                <div className={cn(
                  'border rounded-sm p-4',
                  gtdMetrics.staleProjects.length > 0
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-white border-slate-200'
                )}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('p-1.5 rounded-lg', gtdMetrics.staleProjects.length > 0 ? 'bg-orange-100' : 'bg-slate-100')}>
                      <FolderX size={16} className={gtdMetrics.staleProjects.length > 0 ? 'text-orange-600' : 'text-slate-400'} />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Projetos Parados</span>
                  </div>
                  <p className={cn('text-2xl font-bold', gtdMetrics.staleProjects.length > 0 ? 'text-orange-700' : 'text-slate-900')}>
                    {gtdMetrics.staleProjects.length}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">sem atividade &gt; 7 dias</p>
                </div>

                {/* Tarefas aguardando paradas */}
                <div className={cn(
                  'border rounded-sm p-4',
                  gtdMetrics.staleWaitingTasks.length > 0
                    ? 'bg-red-50 border-red-200'
                    : 'bg-white border-slate-200'
                )}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn('p-1.5 rounded-lg', gtdMetrics.staleWaitingTasks.length > 0 ? 'bg-red-100' : 'bg-slate-100')}>
                      <Hourglass size={16} className={gtdMetrics.staleWaitingTasks.length > 0 ? 'text-red-600' : 'text-slate-400'} />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Aguardando Paradas</span>
                  </div>
                  <p className={cn('text-2xl font-bold', gtdMetrics.staleWaitingTasks.length > 0 ? 'text-red-700' : 'text-slate-900')}>
                    {gtdMetrics.staleWaitingTasks.length}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">sem resposta &gt; 14 dias</p>
                </div>
              </div>

              {/* Alertas detalhados */}
              {(gtdMetrics.staleProjects.length > 0 || gtdMetrics.staleWaitingTasks.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {gtdMetrics.staleProjects.length > 0 && (
                    <div className="bg-white border border-orange-200 rounded-sm p-4">
                      <h3 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Projetos sem atividade
                      </h3>
                      <ul className="space-y-2">
                        {gtdMetrics.staleProjects.map((p) => (
                          <li key={p.id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700 truncate flex-1">{p.name}</span>
                            <span className="text-orange-600 font-medium shrink-0 ml-2">
                              {p.daysSinceActivity}d
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {gtdMetrics.staleWaitingTasks.length > 0 && (
                    <div className="bg-white border border-red-200 rounded-sm p-4">
                      <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                        <Hourglass size={16} />
                        Aguardando sem resposta
                      </h3>
                      <ul className="space-y-2">
                        {gtdMetrics.staleWaitingTasks.map((t) => (
                          <li key={t.id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700 truncate flex-1">{t.name}</span>
                            <span className="text-red-600 font-medium shrink-0 ml-2">
                              {t.daysSinceUpdate}d
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== FLUXO DE TAREFAS ==================== */}
          {taskFlowData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                Fluxo de Tarefas (Funil GTD)
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <ResponsiveContainer width="100%" height={280}>
                  <FunnelChart>
                    <Tooltip
                      formatter={(value: number) => [value, 'Tarefas']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Funnel dataKey="value" data={taskFlowData} isAnimationActive>
                      <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {taskFlowData.map((item) => (
                    <div key={item.name} className="flex items-center gap-3 py-1.5">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.fill }} />
                      <span className="text-sm text-slate-600 flex-1">{item.name}</span>
                      <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== ENERGY TRACKING ==================== */}
          <div className="bg-white border border-slate-200 rounded-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Zap size={20} className="text-amber-500" />
              Análise de Energia
            </h3>
            {energyStats.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={energyChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={12} unit="h" />
                    <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={12} width={100} />
                    <Tooltip
                      formatter={(value: number) => [`${value}h`, 'Tempo']}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                    <Bar dataKey="horas" radius={[0, 4, 4, 0]}>
                      {energyChartData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {energyStats.map((e) => (
                    <div key={e.energy_level} className="p-3 rounded-lg bg-slate-50 flex items-center gap-3">
                      <span className="text-xl">{ENERGY_ICONS[e.energy_level]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{ENERGY_LABELS[e.energy_level]}</p>
                        <p className="text-xs text-slate-500">{e.taskCount} tarefa{e.taskCount !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-sm font-medium text-slate-900">{formatTime(e.totalSeconds)}</p>
                        <p className="text-xs text-slate-400">média: {formatTime(e.avgSeconds)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">
                <Zap size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum dado de energia ainda.</p>
                <p className="text-xs mt-1">Defina o nível de energia ao criar tarefas.</p>
              </div>
            )}
          </div>

          {/* ==================== CHARTS ROW ==================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart - Tempo por dia da semana */}
            <div className="bg-white border border-slate-200 rounded-sm p-6">
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
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart - Por Status */}
            <div className="bg-white border border-slate-200 rounded-sm p-6">
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
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
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

          {/* ==================== CATEGORIA ==================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-sm p-6">
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
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
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

            <div className="bg-white border border-slate-200 rounded-sm p-6">
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
                          style={{ backgroundColor: `${CATEGORY_COLORS[cat.category]}20` }}
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

          {/* ==================== TOP TAREFAS ==================== */}
          <div className="bg-white border border-slate-200 rounded-sm p-6">
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
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {taskTimeStats.slice(0, 6).map((task, index) => (
                    <div
                      key={task.taskId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                    >
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="flex-1 text-sm text-slate-700 truncate">{task.taskName}</span>
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

          {/* ==================== HEATMAP ==================== */}
          <div className="bg-white border border-slate-200 rounded-sm p-6">
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

// ===================== HELPER COMPONENT =====================

interface StatCardProps {
  icon: React.ReactNode
  iconBg: string
  value: string | number
  label: string
}

function StatCard({ icon, iconBg, value, label }: StatCardProps): React.JSX.Element {
  return (
    <div className="bg-white border border-slate-200 rounded-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  )
}
