# Visão geral

## O que é o TickTask

Aplicativo de desktop (Electron) para gestão pessoal de tarefas e tempo, organizado em torno do
método **GTD** (*Getting Things Done*). Local-first: tudo vive num SQLite na máquina do usuário;
a sincronização com o Notion é opcional e unidirecional (app → Notion).

Duas ideias convivem na interface e às vezes competem por espaço:

1. **Sistema GTD completo** — inbox, contextos, projetos, áreas, horizontes, revisão semanal.
2. **Cronômetro de tarefas** — timer por tarefa, sessões, limite de tempo, alerta de *time leak*.

Toda a interface está em português. Não há tema escuro em uso (existem tokens `.dark` no CSS, mas
nada aciona a classe).

## Vocabulário do domínio

Estes termos aparecem literalmente na tela e devem ser preservados num redesenho.

### Status da tarefa (`TaskStatus`)

O ciclo de vida GTD. Uma tarefa tem exatamente um status.

| Valor | Rótulo na tela | Cor do badge | Significado |
| --- | --- | --- | --- |
| `inbox` | Inbox | slate (cinza) | Capturado, ainda não processado |
| `aguardando` | Aguardando | amarelo | Delegado / esperando terceiro |
| `proximas` | Próximas | azul | Próxima ação, pronta para execução |
| `executando` | Executando | esmeralda (com `animate-pulse`) | Em andamento |
| `finalizada` | Finalizada | roxo | Concluída |
| `someday` | Someday/Maybe | teal | Talvez um dia |

### Categoria da tarefa (`TaskCategory`)

Prioridade/natureza. Independente do status.

| Valor | Rótulo | Ícone | Cor |
| --- | --- | --- | --- |
| `urgente` | Urgente | `AlertTriangle` | vermelho |
| `prioridade` | Prioridade | `Flag` | laranja |
| `normal` | Normal | `Circle` | azul |
| `time_leak` | Time Leak | `Clock` | amarelo |

**Time Leak** é a categoria mais visualmente carregada do app: identifica tarefas que consomem
tempo sem gerar valor. O fundo do card/linha muda conforme o tempo acumulado (amarelo → laranja →
vermelho), e acima de 1h o cronômetro pulsa em vermelho e o sistema dispara notificação a cada 5
minutos.

### Nível de energia (`EnergyLevel`)

Quanto de disposição a tarefa exige. Usado como filtro mental e alimenta o gráfico do dashboard.

| Valor | Rótulo | Emoji | Cor |
| --- | --- | --- | --- |
| `alto` | Alta Energia | ⚡ | `#22c55e` |
| `medio` | Energia Média | 🔋 | `#f59e0b` |
| `baixo` | Baixa Energia | 😴 | `#94a3b8` |

### Demais entidades

- **Contexto** — *onde* ou *com o que* a ação pode ser feita (`@computador`, `@telefone`). Tem nome,
  emoji e cor. Uma tarefa pode ter vários. Oito contextos padrão são criados na primeira execução.
- **Tag** ("Fonte / Tag") — rótulo livre, criado enquanto se digita. Tem nome e cor. Uma tarefa pode
  ter várias.
- **Projeto** — resultado que exige mais de uma ação. Tem nome, descrição, *outcome* (resultado
  desejado), status (`active` / `someday` / `done` / `archived`), cor, data limite e área.
- **Área de foco** (Horizonte 2) — responsabilidade contínua (Carreira, Saúde). Tem nome, descrição e
  emoji. Agrupa projetos.
- **Meta / Visão / Propósito** (Horizontes 3, 4 e 5) — objetivos de longo prazo, opcionalmente
  ligados a uma área.
- **Bloco de tempo** — reserva de agenda (`data`, `início`, `fim`) apontando para uma tarefa.
- **Revisão semanal** — sessão com checklist de 8 itens, notas e carimbo de conclusão.

### Relações entre tarefas

- **Subtarefa** — `parent_task_id`. Uma tarefa-pai exibe barra de progresso e contador `feitas/total`.
- **Dependência** — "depende de". Enquanto a dependência não estiver `finalizada`, a tarefa fica
  **bloqueada**: cadeado laranja em toda listagem e botão Iniciar desabilitado.
- **Recorrência** — `daily` / `weekly` / `monthly`. Concluir a tarefa gera a próxima instância.

## Estrutura da janela principal

```
┌──────────────────────────────────────────────────────────────┐
│ TitleBar — h-14, bg-white, border-b slate-200                │
│ [ícone 32px] TickTask App          [ações — só na rota "/"]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ <main class="flex-1 overflow-hidden">                        │
│   ← a rota ativa ocupa 100% desta área (h-full, nunca 100vh) │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Sobrepostos (position: fixed):                               │
│  • FloatingTimer   — bottom-6 right-6, só fora de sub-páginas│
│  • SyncNotification— top-14 right-4                          │
│  • Toaster (sonner)— bottom-right                            │
└──────────────────────────────────────────────────────────────┘
```

Dimensões da janela: `1024 × 700`, mínimo `800 × 600`, moldura nativa do SO com menu escondido
(`autoHideMenuBar`). O `TitleBar` é conteúdo do app, não uma barra de título customizada — os canais
`window:minimize` / `maximize` / `close` existem no preload mas **não estão ligados a nenhum botão**
da interface atual.

### TitleBar (`components/TitleBar.tsx`)

- **Esquerda:** ícone 32px + "TickTask App" em `text-xl font-bold text-slate-900`.
- **Direita:** a barra de navegação inteira, **renderizada apenas quando `location.pathname === '/'`**.
  Em qualquer outra rota o lado direito fica vazio e a navegação depende do botão "Voltar" da própria
  tela.

Ordem dos botões (todos `size="sm" h-9`):

| # | Rótulo | Ícone | Destino | Variante |
| --- | --- | --- | --- | --- |
| 1 | *(só ícone)* | `Settings` | `/settings` | ghost |
| 2 | Calendário | `Calendar` | `/calendar` | outline |
| 3 | Hoje | `CalendarDays` | `/today` | outline |
| 4 | Revisão | `ClipboardCheck` | `/review` | outline |
| 5 | Contextos | `MapPin` | `/contexts` | outline |
| 6 | Tags | `Tag` | `/tags` | outline |
| 7 | Horizontes | `Mountain` | `/horizons` | outline |
| 8 | Projetos | `FolderKanban` | `/projects` | outline |
| 9 | Dashboard | `BarChart3` | `/dashboard` | outline |
| 10 | Arquivadas | `Archive` | `/archived` | outline |
| 11 | Nova Tarefa | `Plus` | *abre diálogo* | primária (`bg-slate-900`) |

"Nova Tarefa" não navega: emite `open-new-task-dialog` num `eventEmitter` global definido em
`App.tsx`, e a `TaskListPage` escuta esse evento para abrir o `TaskDialog`.

> **Onze botões numa linha só.** Em 1024px — a largura padrão da janela — essa barra é o principal
> ponto de pressão do layout atual e o candidato mais óbvio a virar uma sidebar ou um menu agrupado.

## Rotas

| Rota | Tela | Documento | Sub-página¹ |
| --- | --- | --- | --- |
| `/` | Lista de tarefas | [01](01-lista-de-tarefas.md) | não |
| `/task/:id` | Detalhe da tarefa | [02](02-detalhe-da-tarefa.md) | sim |
| `/today` | Plano do dia | [03](03-plano-do-dia.md) | sim |
| `/calendar` | Calendário | [04](04-calendario.md) | sim |
| `/projects` | Projetos | [05](05-projetos.md) | sim |
| `/project/:id` | Detalhe do projeto | [05](05-projetos.md) | sim |
| `/horizons` | Horizontes GTD | [06](06-horizontes.md) | sim |
| `/review` | Revisão semanal | [07](07-revisao-semanal.md) | sim |
| `/dashboard` | Dashboard | [08](08-dashboard.md) | sim |
| `/contexts` | Contextos | [09](09-contextos-e-tags.md) | sim |
| `/tags` | Tags | [09](09-contextos-e-tags.md) | sim |
| `/archived` | Arquivadas | [10](10-arquivadas.md) | sim |
| `/settings` | Configurações | [11](11-configuracoes.md) | sim |
| `/float` | Timer flutuante | [12](12-janelas-auxiliares.md) | janela própria |
| `/quick-capture` | Captura rápida | [12](12-janelas-auxiliares.md) | janela própria |

¹ "Sub-página" controla apenas uma coisa: o `FloatingTimer` (a pílula preta no canto inferior
direito) **não aparece** em sub-páginas. Fora isso, todas as rotas se comportam igual.

## As três janelas

Todas as três carregam **o mesmo bundle do renderer** e se diferenciam pelo hash da URL.

| Janela | Rota | Dimensões | Características |
| --- | --- | --- | --- |
| Principal | `#/` | 1024×700 (mín. 800×600) | moldura do SO, menu escondido |
| Timer flutuante | `#/float` | 300 × dinâmica (44px por timer, até 5, + rodapé 44 + 16) | sem moldura, transparente, sempre no topo, fora da barra de tarefas, arrastável |
| Captura rápida | `#/quick-capture` | 400×140, centralizada a 1/3 da altura | sem moldura, transparente, sempre no topo, fecha ao perder o foco |

Regras de exibição do float, decididas no processo principal (não pelo renderer):

- **Minimizar** ou **fechar** a janela principal → mostra o float **se houver timer rodando**.
- **Restaurar** ou **focar** a janela principal → esconde o float.
- Fechar a janela principal não encerra o app: ele fica na bandeja.

O app também registra um **ícone de bandeja** (Abrir TickTask · Captura rápida · Sair) e um **atalho
global `Ctrl/Cmd + Shift + Space`** que abre a captura rápida de qualquer lugar do sistema.

## Padrões que se repetem em toda tela

Reconhecer estes padrões evita redesenhar a mesma coisa quinze vezes.

### 1. Cabeçalho de sub-página

Presente em `/today`, `/calendar`, `/projects`, `/project/:id`, `/horizons`, `/review`,
`/dashboard`, `/contexts`, `/tags`, `/archived`, `/settings`.

```
<header class="shrink-0 px-6 py-4 bg-white border-b border-slate-200
               flex items-center justify-between">
  [← Voltar] [divisor vertical] [ícone] [título]     [ação primária]
</header>
```

Variações reais: o divisor `h-6 w-px bg-slate-200` existe em algumas telas e não em outras; o botão
Voltar às vezes é `<Button variant="ghost">` e às vezes um `<button>` cru; o destino é quase sempre
`/`, exceto no detalhe do projeto (volta para `/projects`) e no detalhe da tarefa (`navigate(-1)`).

### 2. Casca de página

```
<div class="flex flex-col h-full overflow-hidden bg-slate-50">
  <header … />
  <ScrollArea class="flex-1 h-0">
    <div class="p-6 pb-24">  ← conteúdo
  </ScrollArea>
</div>
```

O `h-full` (não `h-screen`) é deliberado: o `<main>` do App já descontou a altura do TitleBar. O
`pb-24` reserva espaço para o `FloatingTimer` não cobrir a última linha.

### 3. Abas em pílula

Filtros de status na lista de tarefas, em projetos e no plano do dia usam o mesmo botão:

```
ativo:   bg-slate-900 text-white shadow-md
inativo: bg-white text-slate-600 border border-slate-200 hover:bg-slate-100
formato: rounded-full px-4 py-2 text-sm font-medium
```

### 4. Cartão de superfície

`bg-white border border-slate-200 rounded-sm p-4` — o contêiner padrão de conteúdo. O `rounded-sm`
é resultado de uma decisão de "design flat" que substituiu o `rounded-xl` + `shadow` originais.

### 5. Ações reveladas no hover

Editar/excluir em cartões de contexto, tag, área e meta ficam em `opacity-0
group-hover:opacity-100`. O mesmo vale para o checkbox do `TaskCard` e o botão "Hoje".

### 6. Estado vazio

Ícone grande dentro de um círculo `bg-slate-100 p-4 rounded-full`, frase principal e, às vezes, um
botão de ação. Formulações e tamanhos variam de tela para tela.

### 7. Diálogo de confirmação

`AlertDialog` (Radix) com título, descrição, "Cancelar" e ação destrutiva em vermelho. O
`DeleteConfirmDialog` embrulha esse padrão com textos padrão.

### 8. Feedback de ação

`toast` (sonner) no canto inferior direito para sucesso e erro. A sincronização com o Notion tem seu
próprio banner (`SyncNotification`) no topo direito, logo abaixo do TitleBar.

## Como os dados chegam à tela

Não há store global de dados — apenas o `timerStore` (Zustand) para o cronômetro ao vivo. Cada tela
busca o que precisa através de hooks que chamam `window.api.*` (IPC para o processo principal).

| Hook | Fornece |
| --- | --- |
| `useTasks(filters)` | Lista de tarefas filtrada + `createTask` / `refreshTasks` |
| `useTaskDetail(id)` | Tarefa, sessões de tempo, update/status/arquivar/deletar |
| `useProjects()` / `useProjectDetail(id)` | Projetos |
| `useContexts()` / `useTags()` | Taxonomias |
| `useHorizons()` → `useAreas()` / `useGoals()` | Áreas e metas |
| `useCalendarWeek(inicio)` / `useCalendarMonth(ano-mês)` | Agenda e blocos de tempo |
| `useWeeklyReview()` | Revisão corrente, histórico, indicadores de saúde |
| `useTimer()` / `timerStore` | Cronômetros ativos |
| `useNotification()` | Notificações do SO |
| `usePersistedState(chave, inicial)` | Preferência de visualização em `localStorage` |
| `useIncrementalList(itens, chave)` | Renderização em lotes de 60 via `IntersectionObserver` |

**Atualização entre telas** acontece por evento, não por estado compartilhado: o processo principal
emite `tasks:refresh` e as telas interessadas recarregam. Outros eventos push: `float:update`,
`float:clear`, `timer:stopped`, `task:unblocked`, `notion:syncStart|syncSuccess|syncError`.

## O que a interface memoriza

Chaves em `localStorage` (via `usePersistedState`):

| Chave | Padrão | Efeito |
| --- | --- | --- |
| `ticktask:taskListStatusFilter` | `'inbox'` | Aba de status ativa na lista |
| `ticktask:taskListViewMode` | `'table'` | Cards ou tabela |
| `ticktask:taskListGrouping` | `false` | Agrupamento ligado |
| `ticktask:taskListGroupBy` | `'project'` | Agrupar por projeto ou contexto |
| `ticktask:executandoKanban` | `false` | Kanban na aba Executando |
| `ticktask.notesWidth` | `550` | Largura do painel de notas |
| `ticktask.notesZenWidth` | `640` | Largura da coluna no modo zen |

Note a inconsistência de nomenclatura: cinco chaves usam `:` e duas usam `.`.
