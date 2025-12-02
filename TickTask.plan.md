# Especificação Técnica - TickTask

## 1. Visão Geral
Aplicação Electron minimalista para gerenciar tarefas com cronômetro integrado, sistema de status, tempo limite e arquivamento. Interface limpa usando shadcn/ui com navegação entre telas.

## 2. Estrutura do Banco de Dados (SQLite)

### Tabela: tasks
```sql
CREATE TABLE tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  total_seconds INTEGER DEFAULT 0,
  time_limit_seconds INTEGER,
  status TEXT DEFAULT 'inbox' CHECK(status IN ('inbox', 'aguardando', 'proximas', 'executando', 'finalizada')),
  is_running INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Tabela: time_entries
```sql
CREATE TABLE time_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME,
  duration_seconds INTEGER,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

## 3. Sistema de Status

### Fluxo de Status
```
inbox → aguardando → proximas → executando → finalizada
  ↓         ↓           ↓            ↓            ↓
  └─────────────────── arquivada ──────────────────┘
```

### Regras de Transição
- **inbox**: Status inicial ao criar tarefa
- **aguardando**: Movido manualmente (tarefa pendente de algo)
- **proximas**: Movido manualmente (próximas a serem executadas)
- **executando**: Automaticamente ao iniciar timer OU manualmente
- **finalizada**: Manualmente ao concluir tarefa
- **arquivada**: Pode arquivar de qualquer status

### Cores por Status
- inbox: `text-gray-500`
- aguardando: `text-yellow-500`
- proximas: `text-blue-500`
- executando: `text-green-500`
- finalizada: `text-purple-500`

## 4. Arquitetura do Projeto

### 4.1 Main Process (src/main/index.ts)

**IPC Handlers:**
- `task:create` - criar nova tarefa
- `task:list` - listar tarefas (filtro: archived true/false)
- `task:get` - obter tarefa individual por ID
- `task:update` - atualizar tarefa (nome, descrição, status, time_limit)
- `task:delete` - deletar tarefa permanentemente
- `task:archive` - arquivar tarefa (is_archived = 1)
- `task:unarchive` - desarquivar tarefa (is_archived = 0)
- `task:start` - iniciar cronômetro
- `task:stop` - parar cronômetro
- `task:updateStatus` - atualizar status da tarefa
- `timer:tick` - atualizar tempo (chamado pelo renderer a cada segundo)

**Notificações:**
- Usar `Notification` do Electron
- Disparar quando `total_seconds >= time_limit_seconds`
- Handler: `notification:show` com título e mensagem

### 4.2 Preload (src/preload/index.ts)

```typescript
interface ElectronAPI {
  // CRUD
  createTask: (data: CreateTaskInput) => Promise<Task>
  listTasks: (archived?: boolean) => Promise<Task[]>
  getTask: (id: number) => Promise<Task>
  updateTask: (id: number, data: Partial<Task>) => Promise<void>
  deleteTask: (id: number) => Promise<void>
  
  // Archive
  archiveTask: (id: number) => Promise<void>
  unarchiveTask: (id: number) => Promise<void>
  
  // Timer
  startTask: (id: number) => Promise<void>
  stopTask: (id: number) => Promise<void>
  updateTimer: (id: number, seconds: number) => Promise<void>
  
  // Status
  updateStatus: (id: number, status: TaskStatus) => Promise<void>
  
  // Notifications
  showNotification: (title: string, body: string) => void
}
```

### 4.3 Renderer - Estrutura de Rotas

**Router (React Router v6)**
```
/ (TaskListPage)
/task/:id (SingleTaskPage)
/archived (ArchivedTasksPage)
```

#### Pages

**TaskListPage.tsx** (`/`)
- Header com título e botão "Nova Tarefa"
- Tabs para filtrar por status (Todas, Inbox, Aguardando, Próximas, Executando, Finalizadas)
- Lista de tarefas em cards
- Link para página de arquivadas
- Cada card clicável navega para `/task/:id`

**SingleTaskPage.tsx** (`/task/:id`)
- Botão voltar (← para TaskListPage)
- Nome e descrição da tarefa (editável inline)
- Status atual com dropdown para mudar
- Timer grande e centralizado
- Controles: Start/Pause, Reset, Salvar
- Seção de tempo limite (input + indicador de progresso)
- Botões: Arquivar, Deletar (com confirmação)
- Lista de time entries (histórico de sessões)

**ArchivedTasksPage.tsx** (`/archived`)
- Lista de tarefas arquivadas
- Botão para desarquivar
- Botão para deletar permanentemente

#### Componentes

**components/TaskCard.tsx**
- Card com nome, tempo total, status badge
- Clicável (navegação)
- Props: `task`, `onClick`

**components/TaskList.tsx**
- Grid/lista de TaskCards
- Props: `tasks`, `onTaskClick`

**components/Timer.tsx**
- Display grande do cronômetro
- Barra de progresso se houver time_limit
- Controles: Play/Pause, Reset, Save
- Props: `taskId`, `initialSeconds`, `timeLimit`, `isRunning`

**components/TaskDialog.tsx**
- Modal para criar/editar tarefa
- Inputs: nome, descrição, time_limit (opcional)
- Props: `open`, `onOpenChange`, `onSubmit`, `task?`

**components/StatusBadge.tsx**
- Badge colorido com nome do status
- Props: `status`

**components/StatusSelect.tsx**
- Dropdown para mudar status
- Props: `value`, `onChange`

**components/TimeEntryList.tsx**
- Lista histórico de sessões
- Mostra data, duração de cada entrada
- Props: `entries`

**components/DeleteConfirmDialog.tsx**
- Dialog de confirmação para deletar
- Props: `open`, `onOpenChange`, `onConfirm`

**components/ui/** (shadcn/ui)
- Button, Dialog, Input, Card, ScrollArea, Toast, Badge, Select, Tabs, Progress, Alert

## 5. Fluxo de Dados Detalhado

### 5.1 Criar Tarefa
1. TaskListPage: usuário clica "Nova Tarefa"
2. TaskDialog abre
3. Preenche nome, descrição (opcional), time_limit (opcional)
4. Submit: `window.electronAPI.createTask({name, description, time_limit_seconds})`
5. Main process insere no SQLite com status 'inbox'
6. Retorna tarefa criada
7. TaskListPage atualiza lista
8. Opcionalmente navega para `/task/:id`

### 5.2 Navegar para Tarefa
1. TaskListPage: usuário clica em TaskCard
2. `navigate(/task/${taskId})`
3. SingleTaskPage carrega: `window.electronAPI.getTask(id)`
4. Renderiza informações completas da tarefa

### 5.3 Iniciar Timer
1. SingleTaskPage: usuário clica "Start"
2. `window.electronAPI.startTask(taskId)`
3. Main process:
   - Insere em `time_entries` com `start_time`
   - Atualiza `is_running = 1`
   - Se status não for 'executando', atualiza para 'executando'
4. Renderer:
   - Inicia setInterval local (1 segundo)
   - A cada tick: incrementa contador local + atualiza UI
   - Periodicamente chama `window.electronAPI.updateTimer(taskId, currentSeconds)`

### 5.4 Parar Timer
1. SingleTaskPage: usuário clica "Pause"
2. `window.electronAPI.stopTask(taskId)`
3. Main process:
   - Calcula duração desde start_time
   - Atualiza `time_entries` com `end_time` e `duration_seconds`
   - Soma ao `total_seconds` da tarefa
   - Atualiza `is_running = 0`
4. Renderer para setInterval

### 5.5 Mudar Status
1. SingleTaskPage: usuário seleciona novo status no dropdown
2. `window.electronAPI.updateStatus(taskId, newStatus)`
3. Main process atualiza campo `status`
4. UI atualiza badge

### 5.6 Notificação de Tempo Limite
1. No setInterval do timer, verifica: `currentSeconds >= timeLimit`
2. Se true e ainda não notificou (flag local):
   - `window.electronAPI.showNotification('Tempo Limite!', 'Task X atingiu o limite de tempo')`
   - Marca flag para não repetir notificação
3. Main process dispara Notification nativa

### 5.7 Arquivar Tarefa
1. SingleTaskPage: usuário clica "Arquivar"
2. `window.electronAPI.archiveTask(taskId)`
3. Main process: `is_archived = 1`
4. Navega de volta para TaskListPage
5. Tarefa some da lista principal

### 5.8 Desarquivar Tarefa
1. ArchivedTasksPage: usuário clica "Desarquivar"
2. `window.electronAPI.unarchiveTask(taskId)`
3. Main process: `is_archived = 0`
4. Tarefa volta para TaskListPage

### 5.9 Deletar Tarefa
1. Usuário clica "Deletar"
2. DeleteConfirmDialog abre
3. Confirma: `window.electronAPI.deleteTask(taskId)`
4. Main process deleta do SQLite
5. Navega para TaskListPage

## 6. Layout das Interfaces

### 6.1 TaskListPage
```
┌─────────────────────────────────────┐
│  TickTask           [+ Nova Tarefa] │
├─────────────────────────────────────┤
│ [Todas] [Inbox] [Aguardando] [...] │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ Task 1           [executando] │  │
│  │ 01:23:45                      │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ Task 2           [inbox]      │  │
│  │ 00:00:00                      │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Ver Arquivadas]                   │
└─────────────────────────────────────┘
```

### 6.2 SingleTaskPage
```
┌─────────────────────────────────────┐
│  ← Voltar                           │
├─────────────────────────────────────┤
│  Task Name (editável)               │
│  Descrição (editável)               │
│                                     │
│  Status: [Dropdown: executando ▼]  │
│                                     │
│  ┌───────────────────────────────┐ │
│  │        TIMER                  │ │
│  │        01:23:45               │ │
│  │  ▓▓▓▓▓▓▓▓▓░░░░░░ 60%          │ │ (se tem limite)
│  │                               │ │
│  │  [▶ Start] [■ Stop] [↻ Reset]│ │
│  │              [💾 Salvar]      │ │
│  └───────────────────────────────┘ │
│                                     │
│  Tempo Limite: [02:00:00] (input)  │
│                                     │
│  Histórico de Sessões               │
│  • 02/12 - 00:45:23                 │
│  • 01/12 - 00:38:22                 │
│                                     │
│  [📦 Arquivar]        [🗑️ Deletar]  │
└─────────────────────────────────────┘
```

### 6.3 ArchivedTasksPage
```
┌─────────────────────────────────────┐
│  ← Voltar                           │
│  Tarefas Arquivadas                 │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ Task Antiga      [finalizada] │  │
│  │ 05:23:45                      │  │
│  │ [↩ Desarquivar]  [🗑️ Deletar] │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 7. Hooks Customizados

**hooks/useTimer.ts**
- Gerencia cronômetro local
- Detecta tempo limite e dispara notificação
- Retorna: `seconds`, `isRunning`, `progress`, `hasReachedLimit`, `start()`, `pause()`, `reset()`

**hooks/useTasks.ts**
- Gerencia lista de tarefas
- Filtros por status e archived
- Retorna: `tasks`, `loading`, `refreshTasks()`, `createTask()`, `deleteTask()`

**hooks/useTaskDetail.ts**
- Gerencia tarefa individual
- Retorna: `task`, `loading`, `updateTask()`, `archiveTask()`, `deleteTask()`

**hooks/useNotification.ts**
- Wrapper para notificações
- Debounce para não repetir
- Retorna: `notify(title, body)`

## 8. TypeScript Types

```typescript
type TaskStatus = 'inbox' | 'aguardando' | 'proximas' | 'executando' | 'finalizada'

interface Task {
  id: number
  name: string
  description?: string
  total_seconds: number
  time_limit_seconds?: number
  status: TaskStatus
  is_running: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

interface TimeEntry {
  id: number
  task_id: number
  start_time: string
  end_time: string | null
  duration_seconds: number | null
}

interface CreateTaskInput {
  name: string
  description?: string
  time_limit_seconds?: number
}
```

## 9. Formatação e Utilidades

```typescript
// Formatar tempo HH:MM:SS
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// Calcular progresso (0-100)
function calculateProgress(current: number, limit: number): number {
  if (!limit) return 0
  return Math.min((current / limit) * 100, 100)
}

// Parse input de tempo (HH:MM:SS) para segundos
function parseTimeInput(timeString: string): number {
  const parts = timeString.split(':').map(Number)
  const [h = 0, m = 0, s = 0] = parts
  return h * 3600 + m * 60 + s
}
```

## 10. Configuração do shadcn/ui

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add scroll-area
npx shadcn@latest add toast
npx shadcn@latest add badge
npx shadcn@latest add select
npx shadcn@latest add tabs
npx shadcn@latest add progress
npx shadcn@latest add alert
npx shadcn@latest add textarea
```

## 11. Ordem de Implementação

1. **Setup básico**
   - Banco SQLite com novas colunas
   - IPC handlers completos
   - Preload API estendida

2. **Routing**
   - Instalar react-router-dom
   - Configurar rotas principais

3. **TaskListPage**
   - TaskCard component
   - TaskList component
   - Filtros por status (Tabs)
   - Botão criar tarefa
   - TaskDialog

4. **SingleTaskPage**
   - Layout básico
   - Carregar task detail
   - Nome/descrição editável inline

5. **Timer functionality**
   - Timer component
   - useTimer hook
   - Start/Pause/Reset
   - Persistência no SQLite

6. **Status system**
   - StatusBadge component
   - StatusSelect component
   - Atualização de status

7. **Time limit**
   - Input de tempo limite
   - Barra de progresso
   - Notificação quando atingir

8. **Archive/Delete**
   - ArchivedTasksPage
   - Botões de arquivar/desarquivar
   - Delete confirmation dialog

9. **Time entries history**
   - TimeEntryList component
   - Exibir histórico no SingleTaskPage

10. **Polish**
    - Estilos finais
    - Transições suaves
    - Toast notifications
    - Tratamento de erros
    - Loading states

## 12. Tratamento de Erros

- Wrap IPC calls em try-catch
- Exibir Toast para erros
- Loading states durante operações assíncronas
- Validação de inputs (nome obrigatório, time_limit válido)
- Confirmação antes de deletar

## 13. Persistência de Estado

- Tarefa em execução: salvar no SQLite
- Ao reabrir app: verificar `is_running = 1`
- Restaurar timer automaticamente no SingleTaskPage
- Calcular tempo decorrido desde `start_time` mais recente

## 14. Notificações Nativas

```typescript
// No main process
ipcMain.handle('notification:show', (_, title: string, body: string) => {
  new Notification({
    title,
    body,
    icon: path.join(__dirname, '../../resources/icon.png')
  }).show()
})
```

## 15. Acessibilidade

- Navegação por teclado
- Esc para fechar dialogs
- Enter para submeter forms
- Focus trap em modals
- Labels adequados em inputs