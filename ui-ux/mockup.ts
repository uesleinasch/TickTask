import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Save, 
  Archive, 
  Trash2, 
  ArrowLeft, 
  Plus, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Inbox,
  Hourglass,
  ListTodo,
  Activity,
  CheckSquare,
  Undo2,
  Maximize2
} from 'lucide-react';

// --- Tipos (Baseados na Spec) ---

type TaskStatus = 'inbox' | 'aguardando' | 'proximas' | 'executando' | 'finalizada';

interface Task {
  id: number;
  name: string;
  description: string;
  total_seconds: number;
  time_limit_seconds?: number;
  status: TaskStatus;
  is_running: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

interface TimeEntry {
  id: number;
  task_id: number;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
}

// --- Componentes UI Reutilizáveis (Simulando Shadcn/ui) ---

const Button = ({ children, variant = 'primary', size = 'md', className = '', onClick, disabled }: any) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
  const variants: any = {
    primary: "bg-slate-900 text-white hover:bg-slate-900/90 shadow",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
    destructive: "bg-red-500 text-white hover:bg-red-500/90 shadow-sm",
    outline: "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900",
    ghost: "hover:bg-slate-100 hover:text-slate-900",
    link: "text-slate-900 underline-offset-4 hover:underline",
  };
  const sizes: any = {
    sm: "h-8 rounded-md px-3 text-xs",
    md: "h-9 px-4 py-2",
    lg: "h-10 rounded-md px-8",
    icon: "h-9 w-9",
  };
  
  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }: any) => (
  <div className={`rounded-xl border border-slate-200 bg-white text-slate-950 shadow ${className}`}>
    {children}
  </div>
);

const Badge = ({ status }: { status: TaskStatus }) => {
  const styles: Record<TaskStatus, string> = {
    inbox: "bg-slate-100 text-slate-500 hover:bg-slate-100/80",
    aguardando: "bg-yellow-100 text-yellow-600 hover:bg-yellow-100/80",
    proximas: "bg-blue-100 text-blue-600 hover:bg-blue-100/80",
    executando: "bg-emerald-100 text-emerald-600 hover:bg-emerald-100/80 animate-pulse",
    finalizada: "bg-purple-100 text-purple-600 hover:bg-purple-100/80",
  };

  const labels: Record<TaskStatus, string> = {
    inbox: "Inbox",
    aguardando: "Aguardando",
    proximas: "Próximas",
    executando: "Executando",
    finalizada: "Finalizada",
  };

  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none ${styles[status]}`}>
      {labels[status]}
    </div>
  );
};

const ProgressBar = ({ value, max, className = '' }: { value: number; max: number; className?: string }) => {
  const percentage = Math.min((value / max) * 100, 100);
  let colorClass = "bg-slate-900";
  if (percentage > 80) colorClass = "bg-yellow-500";
  if (percentage >= 100) colorClass = "bg-red-500";

  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div 
        className={`h-full transition-all duration-500 ease-in-out ${colorClass}`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

// --- Utilitários ---

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// --- Componentes de Página ---

// Componente Novo: FloatingActiveTask
const FloatingActiveTask = ({ task, onClick }: { task: Task; onClick: () => void }) => {
  if (!task) return null;

  return (
    <div className="absolute bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <button
        onClick={onClick}
        className="group flex items-center gap-3 bg-slate-900 text-white pl-4 pr-5 py-3 rounded-full shadow-2xl hover:bg-slate-800 transition-all hover:scale-105 border border-slate-700"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-emerald-500 rounded-full p-1.5">
            <Activity size={16} className="text-white" />
          </div>
        </div>
        <div className="flex flex-col items-start min-w-[80px]">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
            Executando
          </span>
          <span className="font-mono font-bold text-lg leading-none tabular-nums">
            {formatTime(task.total_seconds)}
          </span>
        </div>
        <div className="border-l border-slate-700 pl-3 ml-1 text-slate-400 group-hover:text-white transition-colors">
            <Maximize2 size={18} />
        </div>
      </button>
    </div>
  );
};

// 1. TaskListPage (Dashboard)
const TaskListPage = ({ 
  tasks, 
  onNavigate, 
  onCreateClick, 
  onArchiveNavigate 
}: { 
  tasks: Task[], 
  onNavigate: (id: number) => void, 
  onCreateClick: () => void,
  onArchiveNavigate: () => void
}) => {
  const [activeTab, setActiveTab] = useState<string>('todas');
  
  const filteredTasks = tasks.filter(t => {
    if (t.is_archived) return false;
    if (activeTab === 'todas') return true;
    return t.status === activeTab;
  });

  const tabs = [
    { id: 'todas', label: 'Todas', icon: ListTodo },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'aguardando', label: 'Aguardando', icon: Hourglass },
    { id: 'proximas', label: 'Próximas', icon: Calendar },
    { id: 'executando', label: 'Executando', icon: Activity },
    { id: 'finalizada', label: 'Finalizadas', icon: CheckSquare },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="px-6 py-5 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-white p-1.5 rounded-lg">
                <Clock size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">TickTask</h1>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onArchiveNavigate}>
                <Archive size={16} className="mr-2" />
                Arquivadas
            </Button>
            <Button onClick={onCreateClick} size="sm">
                <Plus size={16} className="mr-2" />
                Nova Tarefa
            </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                        flex items-center px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
                        ${activeTab === tab.id 
                            ? 'bg-slate-900 text-white shadow-md' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}
                    `}
                >
                    <tab.icon size={14} className="mr-2" />
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-6 pt-2 pb-24">
        {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <ListTodo size={32} />
                </div>
                <p>Nenhuma tarefa encontrada.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map(task => (
                <div 
                    key={task.id}
                    onClick={() => onNavigate(task.id)}
                    className="group cursor-pointer transform transition-all hover:-translate-y-1 hover:shadow-md"
                >
                    <Card className="p-5 h-full flex flex-col justify-between border-l-4 border-l-transparent hover:border-l-slate-900">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <Badge status={task.status} />
                                {task.time_limit_seconds && (
                                    <span className="text-xs text-slate-400 flex items-center">
                                        <AlertCircle size={12} className="mr-1" />
                                        Limite: {formatTime(task.time_limit_seconds)}
                                    </span>
                                )}
                            </div>
                            <h3 className="font-semibold text-slate-900 text-lg leading-tight mb-2 line-clamp-2">
                                {task.name}
                            </h3>
                            <p className="text-slate-500 text-sm line-clamp-2 mb-4">
                                {task.description || "Sem descrição..."}
                            </p>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <div className={`text-2xl font-mono font-medium ${task.is_running ? 'text-emerald-600' : 'text-slate-700'}`}>
                                {formatTime(task.total_seconds)}
                            </div>
                            {task.is_running && (
                                <div className="animate-pulse bg-emerald-100 p-1.5 rounded-full text-emerald-600">
                                    <Activity size={16} />
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};

// 2. SingleTaskPage (Detalhes)
const SingleTaskPage = ({ 
  task, 
  onBack, 
  onUpdate, 
  onDelete, 
  onArchive,
  entries
}: { 
  task: Task, 
  onBack: () => void, 
  onUpdate: (id: number, data: Partial<Task>) => void,
  onDelete: (id: number) => void,
  onArchive: (id: number) => void,
  entries: TimeEntry[]
}) => {
  const [localSeconds, setLocalSeconds] = useState(task.total_seconds);
  const [editName, setEditName] = useState(task.name);
  const [editDesc, setEditDesc] = useState(task.description);
  const [editLimit, setEditLimit] = useState(task.time_limit_seconds ? formatTime(task.time_limit_seconds) : "00:00:00");
  
  // Efeito do Timer
  useEffect(() => {
    setLocalSeconds(task.total_seconds); // Sync ao entrar
    let interval: any;
    
    if (task.is_running) {
      interval = setInterval(() => {
        setLocalSeconds(s => {
            const next = s + 1;
            // Simulação de notificação de limite
            if (task.time_limit_seconds && next === task.time_limit_seconds) {
                // Em um app real: new Notification(...)
                alert(`⚠️ Tempo Limite Atingido para: ${task.name}`);
            }
            return next;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [task.is_running, task.total_seconds, task.time_limit_seconds, task.name]);

  const handleStart = () => {
    onUpdate(task.id, { is_running: true, status: task.status === 'inbox' ? 'executando' : 'executando' });
  };

  const handleStop = () => {
    onUpdate(task.id, { is_running: false, total_seconds: localSeconds });
  };

  const handleReset = () => {
    if (confirm("Resetar o contador para zero?")) {
        setLocalSeconds(0);
        onUpdate(task.id, { total_seconds: 0, is_running: false });
    }
  };

  const handleStatusChange = (e: any) => {
    onUpdate(task.id, { status: e.target.value as TaskStatus });
  };

  const handleBlurSave = () => {
      // Parse time limit
      const parts = editLimit.split(':').map(Number);
      const limitSeconds = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);

      onUpdate(task.id, {
          name: editName,
          description: editDesc,
          time_limit_seconds: limitSeconds > 0 ? limitSeconds : undefined
      });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header Detalhe */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} size="sm" className="pl-0 text-slate-500">
            <ArrowLeft size={18} className="mr-2" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium mr-2">Status:</span>
            <select 
                value={task.status} 
                onChange={handleStatusChange}
                className="bg-slate-100 border-none text-sm font-semibold rounded-md py-1.5 pl-3 pr-8 focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
                <option value="inbox">Inbox</option>
                <option value="aguardando">Aguardando</option>
                <option value="proximas">Próximas</option>
                <option value="executando">Executando</option>
                <option value="finalizada">Finalizada</option>
            </select>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
            
            {/* Bloco de Edição */}
            <div className="space-y-4">
                <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleBlurSave}
                    className="w-full text-3xl font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none transition-colors text-slate-900 placeholder:text-slate-300"
                    placeholder="Nome da Tarefa"
                />
                <textarea 
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    onBlur={handleBlurSave}
                    className="w-full bg-transparent resize-none text-slate-600 focus:outline-none hover:bg-white/50 rounded-md p-2 -ml-2 transition-colors min-h-[80px]"
                    placeholder="Adicione uma descrição..."
                />
            </div>

            {/* Timer Central */}
            <Card className="p-8 flex flex-col items-center justify-center bg-white shadow-lg relative overflow-hidden">
                {task.is_running && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 animate-pulse-slow" />
                )}
                
                <div className={`text-7xl font-mono font-bold tracking-tighter mb-8 tabular-nums ${task.is_running ? 'text-slate-900' : 'text-slate-400'}`}>
                    {formatTime(localSeconds)}
                </div>

                {task.time_limit_seconds && (
                    <div className="w-full max-w-md mb-8 space-y-2">
                        <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            <span>Progresso</span>
                            <span>{Math.round((localSeconds / task.time_limit_seconds) * 100)}%</span>
                        </div>
                        <ProgressBar value={localSeconds} max={task.time_limit_seconds} />
                        <div className="text-center text-xs text-slate-400 mt-1">
                            Meta: {formatTime(task.time_limit_seconds)}
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-4">
                    {!task.is_running ? (
                        <Button onClick={handleStart} className="h-14 px-8 rounded-full text-lg shadow-xl shadow-slate-200">
                            <Play className="fill-current mr-2" /> Iniciar
                        </Button>
                    ) : (
                        <Button onClick={handleStop} variant="outline" className="h-14 px-8 rounded-full text-lg border-2 border-slate-200 hover:border-slate-300 text-slate-700">
                            <Pause className="fill-current mr-2" /> Pausar
                        </Button>
                    )}
                    
                    <Button variant="ghost" size="icon" onClick={handleReset} className="rounded-full h-14 w-14 text-slate-400 hover:text-red-500">
                        <RotateCcw size={20} />
                    </Button>
                </div>
            </Card>

            {/* Configurações & Ações */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Time Limit Input */}
                <Card className="p-4">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                        <AlertCircle size={16} className="mr-2" /> Limite de Tempo
                    </h4>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={editLimit}
                            onChange={(e) => setEditLimit(e.target.value)}
                            onBlur={handleBlurSave}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 font-mono text-sm focus:ring-1 focus:ring-slate-900 outline-none"
                            placeholder="00:00:00"
                        />
                        <Button variant="secondary" size="sm" onClick={handleBlurSave}>Salvar</Button>
                    </div>
                </Card>

                {/* Zona de Perigo */}
                <Card className="p-4 border-slate-100">
                    <h4 className="text-sm font-semibold text-slate-900 mb-3">Ações</h4>
                    <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => onArchive(task.id)}>
                            <Archive size={16} className="mr-2" /> Arquivar
                        </Button>
                        <Button variant="destructive" className="flex-1" onClick={() => onDelete(task.id)}>
                            <Trash2 size={16} className="mr-2" /> Deletar
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Histórico Simulado */}
            <div className="pt-4 pb-20">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Histórico de Sessões</h3>
                <div className="space-y-2">
                    {entries.length > 0 ? entries.map(entry => (
                        <div key={entry.id} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg text-sm">
                            <div className="text-slate-600">
                                {new Date(entry.start_time).toLocaleDateString()} às {new Date(entry.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                            <div className="font-mono text-slate-900">
                                + {formatTime(entry.duration_seconds || 0)}
                            </div>
                        </div>
                    )) : (
                        <div className="text-slate-400 text-sm italic">Nenhuma sessão registrada.</div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// 3. ArchivedTasksPage
const ArchivedTasksPage = ({ 
    tasks, 
    onBack, 
    onUnarchive, 
    onDelete 
}: { 
    tasks: Task[], 
    onBack: () => void, 
    onUnarchive: (id: number) => void, 
    onDelete: (id: number) => void 
}) => {
    const archivedTasks = tasks.filter(t => t.is_archived);

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center">
                <Button variant="ghost" onClick={onBack} size="sm" className="pl-0 text-slate-500">
                    <ArrowLeft size={18} className="mr-2" /> Voltar
                </Button>
                <h1 className="text-lg font-bold text-slate-900 ml-4">Arquivo Morto</h1>
            </header>
            
            <div className="flex-1 overflow-auto p-6 pb-24">
                {archivedTasks.length === 0 ? (
                    <div className="text-center text-slate-400 mt-20">Nenhuma tarefa arquivada.</div>
                ) : (
                    <div className="space-y-3">
                        {archivedTasks.map(task => (
                            <Card key={task.id} className="p-4 flex items-center justify-between opacity-75 hover:opacity-100 transition-opacity">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge status={task.status} />
                                        <span className="text-xs text-slate-400">{new Date(task.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="font-medium text-slate-900">{task.name}</h3>
                                    <div className="text-sm text-slate-500 font-mono mt-1">
                                        Tempo Final: {formatTime(task.total_seconds)}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => onUnarchive(task.id)}>
                                        <Undo2 size={16} className="mr-2" /> Desarquivar
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => onDelete(task.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// 4. Modal de Criação
const CreateTaskModal = ({ open, onClose, onCreate }: any) => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [limit, setLimit] = useState('');

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Parse simple HH:MM:SS or generic number
        let limitSeconds = 0;
        if(limit.includes(':')) {
             const parts = limit.split(':').map(Number);
             limitSeconds = (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
        } else if (limit) {
            limitSeconds = parseInt(limit) * 60; // assume minutes if just number
        }

        onCreate({ name, description: desc, time_limit_seconds: limitSeconds || undefined });
        setName(''); setDesc(''); setLimit('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Nova Tarefa</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                        <input 
                            required autoFocus
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                            placeholder="Ex: Refatorar módulo de login"
                            value={name} onChange={e => setName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Descrição (Opcional)</label>
                        <textarea 
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none h-20"
                            placeholder="Detalhes sobre a tarefa..."
                            value={desc} onChange={e => setDesc(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Limite de Tempo (HH:MM:SS)</label>
                        <input 
                            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-slate-900 outline-none"
                            placeholder="00:00:00"
                            value={limit} onChange={e => setLimit(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button type="submit">Criar Tarefa</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- App Principal ---

export default function TickTaskApp() {
  // State Mock (Simulando SQLite)
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, name: 'Revisão de Código', description: 'Revisar PR #402 do frontend', total_seconds: 4520, status: 'executando', is_running: true, is_archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'Planejamento Q3', description: 'Definir OKRs para o próximo trimestre', total_seconds: 0, status: 'inbox', is_running: false, is_archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'Deploy Produção', description: '', total_seconds: 7200, time_limit_seconds: 7200, status: 'aguardando', is_running: false, is_archived: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 4, name: 'Backup Database', description: 'Rotina semanal', total_seconds: 1200, status: 'finalizada', is_running: false, is_archived: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ]);

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([
      { id: 1, task_id: 1, start_time: new Date().toISOString(), end_time: null, duration_seconds: null }
  ]);

  const [view, setView] = useState<'list' | 'detail' | 'archive'>('list');
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock Global Tick for running tasks (only updates UI if not in detail view)
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prev => prev.map(t => {
        if (t.is_running) {
          return { ...t, total_seconds: t.total_seconds + 1 };
        }
        return t;
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleCreateTask = (data: Partial<Task>) => {
    const newTask: Task = {
        id: Date.now(),
        name: data.name!,
        description: data.description || '',
        total_seconds: 0,
        time_limit_seconds: data.time_limit_seconds,
        status: 'inbox',
        is_running: false,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleUpdateTask = (id: number, data: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    
    // Logica de Time Entry
    if (data.is_running === true) {
        setTimeEntries(prev => [...prev, { id: Date.now(), task_id: id, start_time: new Date().toISOString(), end_time: null, duration_seconds: null }]);
    } else if (data.is_running === false && data.total_seconds !== undefined) {
        // Fechar ultima entry
        // Nota: Em uma app real isso seria muito mais complexo
    }
  };

  const handleArchiveTask = (id: number) => {
      handleUpdateTask(id, { is_running: false, is_archived: true });
      if (view === 'detail') setView('list');
  };

  const handleUnarchiveTask = (id: number) => {
      handleUpdateTask(id, { is_archived: false });
  };

  const handleDeleteTask = (id: number) => {
      if(confirm("Tem certeza que deseja excluir permanentemente?")) {
        setTasks(prev => prev.filter(t => t.id !== id));
        if (view === 'detail') setView('list');
      }
  };

  const handleNavigate = (id: number) => {
      setActiveTaskId(id);
      setView('detail');
  };

  const activeTask = tasks.find(t => t.id === activeTaskId);
  const taskEntries = timeEntries.filter(e => e.task_id === activeTaskId);

  // Logic to determine if we show the float button
  // 1. Is there a running task?
  const runningTask = tasks.find(t => t.is_running);
  // 2. Are we NOT looking at it right now?
  const showFloat = runningTask && (!activeTask || activeTask.id !== runningTask.id);

  return (
    <div className="h-screen w-full bg-slate-50 font-sans text-slate-900 flex justify-center">
      <div className="w-full max-w-5xl h-full shadow-2xl bg-white flex flex-col overflow-hidden relative">
        
        {view === 'list' && (
            <TaskListPage 
                tasks={tasks} 
                onNavigate={handleNavigate} 
                onCreateClick={() => setIsModalOpen(true)}
                onArchiveNavigate={() => setView('archive')}
            />
        )}

        {view === 'detail' && activeTask && (
            <SingleTaskPage 
                task={activeTask} 
                entries={taskEntries}
                onBack={() => setView('list')}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
                onArchive={handleArchiveTask}
            />
        )}

        {view === 'archive' && (
            <ArchivedTasksPage 
                tasks={tasks}
                onBack={() => setView('list')}
                onUnarchive={handleUnarchiveTask}
                onDelete={handleDeleteTask}
            />
        )}

        <CreateTaskModal 
            open={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onCreate={handleCreateTask} 
        />
        
        {/* Floating Action Button for Running Task */}
        {showFloat && runningTask && (
            <FloatingActiveTask 
                task={runningTask} 
                onClick={() => handleNavigate(runningTask.id)} 
            />
        )}
        
      </div>
    </div>
  );
}