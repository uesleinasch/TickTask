# Graph Report - TickTask  (2026-11-10)

## Corpus Check
- 235 files · ~130,373 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 4, .css 2)

## Summary
- 1939 nodes · 5134 edges · 90 communities (83 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 105 edges (avg confidence: 0.86)
- Token cost: 494,852 input · 0 output

## Community Hubs (Navigation)
- Núcleo database.ts + index.ts
- Dependências (package.json)
- Lista de tarefas e badges
- Tipos compartilhados e preload API
- Seções de Configurações
- Primitivos UI e diálogos de confirmação
- Roadmap e Design System
- TaskDialog e Horizontes
- Servidor MCP: transporte e guard
- Tools MCP de estrutura
- Backup e planejamento de snapshot
- Badges de categoria e selects
- App, rotas e eventos de sync
- electron-builder
- DevDependencies e ESLint
- Página de Calendário
- Workflow de release
- Tools MCP de tarefas
- Sincronização Notion
- Time blocks e efeitos MCP
- Extensões Tiptap e upload de imagem
- Bridge MCP (stdio)
- Painel de notas e subtarefas
- Google Calendar (Electron)
- Plano de eventos gcal
- Doc Configurações e script de backup
- ProseMirror → blocos Notion
- Notificações de vencimento
- Markdown ↔ ProseMirror
- Dashboard e painel em execução
- Hooks de dados e timerStore
- Assets de notas e export local
- Editor de desenho Excalidraw
- Doc visão geral: padrões de UI
- Doc biblioteca de componentes
- Template bug report
- Doc design tokens e badges
- Template documentação
- Template feature request
- Queries de tags
- Config shadcn (components.json)
- Conceitos de domínio da tarefa
- Drag handle e menu de tabela
- API Google Calendar
- Doc calendário e filtros
- Scripts npm
- Doc projetos
- Doc detalhe da tarefa
- Doc dashboard
- Menções (@) Tiptap
- OAuth Google (PKCE)
- Config e token MCP
- Formato de notas (Editor.js)
- Doc inconsistências visuais
- Doc janelas auxiliares e bandeja
- tsconfig.web
- Doc abas e preferências da lista
- GTD e revisão semanal
- Doc plano do dia
- Doc contextos e tags
- tsconfig.node
- Mockup dashboard
- Plano Fase 4 do roadmap
- Doc horizontes (áreas/metas)
- Doc arquivadas
- Electron e previews de desenho
- Fila de sync gcal
- Autostart e argumentos de launch
- Código de conduta e contribuição
- Guia CLAUDE.md e fluxo Git
- Doc servidor MCP
- Construtor de queries de tarefa
- Doc janelas e casca de página
- Mockup TS
- Ícone do app
- Passos de setup (Configurações)
- Mockup detalhe da tarefa
- Segurança e armazenamento local
- Notas, desenho e Notion (CLAUDE.md)
- Config electron-vite
- Testes do store MCP
- TagInput
- Guard de janelas auxiliares
- Convenções IPC
- dev-app-update.yml
- useTimer
- tsconfig raiz
- Logo Electron
- Fundo wavy-lines

## God Nodes (most connected - your core abstractions)
1. `setupIpcHandlers()` - 142 edges
2. `cn()` - 111 edges
3. `react` - 71 edges
4. `lucide-react` - 51 edges
5. `Button()` - 50 edges
6. `registerStructureTools()` - 49 edges
7. `Task` - 40 edges
8. `SingleTaskPage()` - 37 edges
9. `Visão geral (UI)` - 37 edges
10. `registerTaskTools()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Sistema de migrations versionadas` --references--> `initDatabase()`  [AMBIGUOUS]
  ROADMAP.md → src/main/database.ts
- `1.4 Captura Rápida Global` --references--> `setupIpcHandlers()`  [AMBIGUOUS]
  ROADMAP.md → src/main/index.ts
- `Cores semânticas de status (Emerald/Yellow/Blue/Purple/Red)` --references--> `StatusBadge()`  [AMBIGUOUS]
  ui-ux/TickTask - Design System & Guia de Estilo.md → src/renderer/src/components/StatusBadge.tsx
- `1.5 Revisão Semanal Assistida` --references--> `useWeeklyReview()`  [AMBIGUOUS]
  ROADMAP.md → src/renderer/src/hooks/useWeeklyReview.ts
- `Filtro e ordenação no SQL, nunca no renderer` --rationale_for--> `listTasks()`  [EXTRACTED]
  CLAUDE.md → src/main/database.ts

## Import Cycles
- 2-file cycle: `src/renderer/src/App.tsx -> src/renderer/src/pages/TaskListPage.tsx -> src/renderer/src/App.tsx`

## Hyperedges (group relationships)
- **Integrações externas do TickTask (Notion, Google Calendar, MCP)** — claude_notion_sync, claude_google_calendar_sync, claude_mcp_server [INFERRED 0.75]
- **Consumidores do esquema ticktask-asset (notas, desenho, CSP)** — claude_ticktask_asset_protocol, claude_rich_notes_tiptap, claude_excalidraw_drawing, src_renderer_index_csp [EXTRACTED 1.00]
- **Modelo de horizontes GTD da Fase 4** — seguindo_o_plano_de_ação_do_roadmap_para_gtd_horizons, seguindo_o_plano_de_ação_do_roadmap_para_area_entity, seguindo_o_plano_de_ação_do_roadmap_para_goal_entity, seguindo_o_plano_de_ação_do_roadmap_para_horizonspage [EXTRACTED 1.00]
- **Pilares GTD da Fase 1** — roadmap_projects_structure, roadmap_someday_maybe, roadmap_contexts, roadmap_quick_capture_global, roadmap_weekly_review [EXTRACTED 1.00]
- **Integrações externas da Fase 5** — roadmap_notion_bidirectional, roadmap_google_calendar_integration, roadmap_github_gitlab_integration, roadmap_slack_integration, roadmap_local_rest_api [EXTRACTED 1.00]
- **Snippets de componentes do design system** — ui_ux_ticktask___design_system___guia_de_estilo_button_variants, ui_ux_ticktask___design_system___guia_de_estilo_task_card_style, ui_ux_ticktask___design_system___guia_de_estilo_input_style, ui_ux_ticktask___design_system___guia_de_estilo_badges_pills, ui_ux_ticktask___design_system___guia_de_estilo_fab_active_task [EXTRACTED 1.00]
- **Modos de layout do detalhe da tarefa** — docs_ui_02_detalhe_da_tarefa_notesviewmode, docs_ui_02_detalhe_da_tarefa_modo_zen, docs_ui_02_detalhe_da_tarefa_notesfocusbar, docs_ui_02_detalhe_da_tarefa_painel_de_notas, docs_ui_02_detalhe_da_tarefa_redimensionamento_notas [EXTRACTED 1.00]
- **Telas que exibem tarefas de hoje** — docs_ui_03_plano_do_dia_todaypage, docs_ui_04_calendario_linha_dia, docs_ui_06_horizontes_h0_proximas_acoes, docs_ui_03_plano_do_dia_scheduled_date [EXTRACTED 1.00]
- **Sinais de saúde GTD** — docs_ui_07_revisao_semanal_healthcard, docs_ui_05_projetos_alerta_sem_proxima_acao, docs_ui_05_projetos_proxima_acao, docs_ui_07_revisao_semanal_inbox_cleared [INFERRED 0.85]
- **Três desenhos para timers em execução** — docs_ui_13_biblioteca_de_componentes_floatingtimer, docs_ui_08_dashboard_runningnowpanel, src_renderer_src_pages_floattimerpage, docs_ui_15_inconsistencias_c2_tres_desenhos_timers [EXTRACTED 1.00]
- **Paletas de cor divergentes/duplicadas** — docs_ui_14_design_tokens_paleta_status_tarefa, docs_ui_14_design_tokens_paleta_categoria, docs_ui_08_dashboard_chart_colors, docs_ui_09_contextos_e_tags_context_colors, docs_ui_14_design_tokens_default_colors, docs_ui_15_inconsistencias_a1_paletas_status_categoria, docs_ui_15_inconsistencias_a2_exports_cor_mortos [INFERRED 0.85]
- **Guarda do bundle compartilhado entre janelas** — docs_ui_12_janelas_auxiliares_bundle_compartilhado, docs_ui_15_inconsistencias_f2_bundle_compartilhado, src_renderer_src_stores_timerwindow, docs_ui_13_biblioteca_de_componentes_timerstore_estado [INFERRED 0.85]
- **Live timer presentation across card, badge and floating pill** — ui_ux_dashboard_task_timer_display, ui_ux_dashboard_status_badge, ui_ux_dashboard_floating_timer_pill [INFERRED 0.85]
- **Task time-tracking flow (timer, limit, session history)** — ui_ux_single_page_timer_card, ui_ux_single_page_time_limit_card, ui_ux_single_page_session_history [INFERRED 0.85]

## Communities (90 total, 7 thin omitted)

### Community 0 - "Núcleo database.ts + index.ts"
Cohesion: 0.05
Nodes (99): addManualTimeEntry(), addTaskDependency(), calculateNextDate(), CategoryStats, closeDatabase(), completeSubtasksCheck(), ContextRow, createArea() (+91 more)

### Community 1 - "Dependências (package.json)"
Cohesion: 0.04
Nodes (64): author, dependencies, better-sqlite3@^12.5.0, class-variance-authority@^0.7.1, clsx@^2.1.1, @dnd-kit/core@^6.3.1, @dnd-kit/sortable@^10.0.0, @dnd-kit/utilities@^3.2.2 (+56 more)

### Community 2 - "Lista de tarefas e badges"
Cohesion: 0.07
Nodes (48): TaskGroups (modo agrupado), eventEmitter, CategoryBadge(), DueDateBadge(), ScheduledTimeBadge(), StatusBadge(), StatusBadgeProps, statusStyles (+40 more)

### Community 3 - "Tipos compartilhados e preload API"
Cohesion: 0.08
Nodes (56): @electron-toolkit/preload, api, CategoryStats, API, CategoryStats, DailyStats, FloatTimerData, GeneralStats (+48 more)

### Community 4 - "Seções de Configurações"
Cohesion: 0.09
Nodes (45): AboutSection(), BackupSection(), askRestore(), backupNow(), chooseFolder(), confirmRestore(), restoreFromOtherFolder(), describeCounts() (+37 more)

### Community 5 - "Primitivos UI e diálogos de confirmação"
Cohesion: 0.11
Nodes (38): lucide-react, react, DeleteConfirmDialog(), DeleteConfirmDialogProps, DependencySelector(), DependencySelectorProps, NotesActions(), NotesActionsProps (+30 more)

### Community 6 - "Roadmap e Design System"
Cohesion: 0.05
Nodes (50): TickTask Roadmap GTD, 4.2 Dashboard Avançado / Energy Tracking, 3.2 Sugestão de Próxima Ação via Claude API, 6.5 Backup e Exportação, 4.3 Visão de Calendário e Time Blocking, 1.3 Contextos, 2.1 Planejamento Diário (TodayPage), 2.5 Datas de Entrega e Alertas (+42 more)

### Community 7 - "TaskDialog e Horizontes"
Cohesion: 0.13
Nodes (40): ColorPicker(), TaskDialog(), TaskDialogProps, Button(), Dialog(), DialogContent(), DialogDescription(), DialogFooter() (+32 more)

### Community 8 - "Servidor MCP: transporte e guard"
Cohesion: 0.08
Nodes (34): @modelcontextprotocol/sdk, zod, updateTaskNotes(), buildMcpStatus(), McpConfig, ALWAYS_CONFIRM, ConfirmStore, createConfirmStore() (+26 more)

### Community 9 - "Tools MCP de estrutura"
Cohesion: 0.09
Nodes (50): deleteArea(), deleteContext(), deleteGoal(), deleteProject(), deleteTag(), listAreas(), listContexts(), listGoals() (+42 more)

### Community 10 - "Backup e planejamento de snapshot"
Cohesion: 0.13
Nodes (35): BackupConfig, chooseBackupFolder(), chooseSnapshotFolder(), configPath(), createBackup(), dataDir(), describeSnapshot(), getBackupStatus() (+27 more)

### Community 11 - "Badges de categoria e selects"
Cohesion: 0.12
Nodes (29): CategoryBadgeProps, categoryIcons, categoryStyles, categoryIcons, CategorySelect(), CategorySelectProps, categoryStyles, ColorPickerProps (+21 more)

### Community 12 - "App, rotas e eventos de sync"
Cohesion: 0.12
Nodes (24): react-router-dom, App(), AppContent(), FloatContent(), QuickCaptureContent(), FloatingTimer(), SyncNotification(), TitleBar() (+16 more)

### Community 13 - "electron-builder"
Cohesion: 0.06
Nodes (33): appId, appImage, artifactName, asarUnpack, deb, afterInstall, afterRemove, artifactName (+25 more)

### Community 14 - "DevDependencies e ESLint"
Cohesion: 0.07
Nodes (33): devDependencies, electron-builder@^25.1.8, @electron-toolkit/eslint-config-prettier@^3.0.0, @electron-toolkit/eslint-config-ts@^3.1.0, @electron-toolkit/tsconfig@^2.0.0, eslint@^9.36.0, eslint-plugin-react@^7.37.5, eslint-plugin-react-hooks@^5.2.0 (+25 more)

### Community 15 - "Página de Calendário"
Cohesion: 0.10
Nodes (30): useCalendarMonth(), useCalendarWeek(), CalendarPage(), goToToday(), nextPeriod(), periodLabel(), prevPeriod(), CalendarView (+22 more)

### Community 16 - "Workflow de release"
Cohesion: 0.07
Nodes (31): runs-on, steps, strategy, GH_TOKEN, jobs, build, release, os (+23 more)

### Community 17 - "Tools MCP de tarefas"
Cohesion: 0.11
Nodes (29): archiveTask(), countTasks(), countTimeBlocksForTask(), deleteTasks(), getChildTaskIds(), getGtdMetrics(), getSubtasks(), getTaskDependencies() (+21 more)

### Community 18 - "Sincronização Notion"
Cohesion: 0.15
Nodes (30): setNoteAssetUpload(), autoSyncToNotion(), syncTasksAfterTagChange(), buildDrawingBlock(), CATEGORY_MAP, configPath, createGTDDatabase(), deleteTaskFromNotion() (+22 more)

### Community 19 - "Time blocks e efeitos MCP"
Cohesion: 0.14
Nodes (28): createTimeBlock(), createWeeklyReview(), deleteTimeBlock(), filterGcalSyncedIds(), getLastWeeklyReview(), getReviewHealthIndicators(), getTasksForDate(), getTimeBlock() (+20 more)

### Community 20 - "Extensões Tiptap e upload de imagem"
Cohesion: 0.10
Nodes (25): @tiptap/core@^3.28.0, @tiptap/extension-file-handler@^3.28.0, @tiptap/extension-highlight@^3.28.0, @tiptap/extension-image@^3.28.0, @tiptap/extension-table@^3.28.0, @tiptap/extension-text-style@3.28.0, @tiptap/starter-kit@^3.28.0, @tiptap/core (+17 more)

### Community 21 - "Bridge MCP (stdio)"
Cohesion: 0.12
Nodes (23): BridgeConfig, delay(), ensureApp(), exitWhenDrained(), handleFrame(), HttpReply, isConnectionRefused(), isPortOpen() (+15 more)

### Community 22 - "Painel de notas e subtarefas"
Cohesion: 0.13
Nodes (22): class-variance-authority, NotesPanel(), TabButton(), SubtaskList(), SubtaskListProps, Badge(), badgeVariants, Card() (+14 more)

### Community 23 - "Google Calendar (Electron)"
Cohesion: 0.19
Nodes (24): getTimeBlocksForTask(), api, configPath(), connectGcal(), disconnectGcal(), getAccessToken(), getGcalStatus(), isConnected() (+16 more)

### Community 24 - "Plano de eventos gcal"
Cohesion: 0.12
Nodes (21): allDay(), buildDesiredEvents(), describeTask(), EventTime, GcalBlockInput, GcalOp, GcalTaskInput, isUpToDate() (+13 more)

### Community 25 - "Doc Configurações e script de backup"
Cohesion: 0.14
Nodes (24): Configurações — /settings, Barra lateral de Configurações (settings.section persistida), Peças compartilhadas (SectionHeader, ToggleRow, StatusPill, OutLink, Callout), Preferências ausentes (aparência, comportamento, backup automático), Seção Backup (snapshot, restauração), Seção Geral (autostart, bandeja, atalho), Seção Google Calendar, Seção Notion (+16 more)

### Community 26 - "ProseMirror → blocos Notion"
Cohesion: 0.16
Nodes (21): codeBlockFor(), decodeEntities(), defaultAnnotations(), EditorJsBlock, EditorJsData, editorJsToNotionBlocks(), firstParagraphInline(), htmlToRichText() (+13 more)

### Community 27 - "Notificações de vencimento"
Cohesion: 0.15
Nodes (14): DueNotification, DueTaskLike, minutesOfDay(), pickDueNotifications(), checkDueDateNotifications(), startNotificationScheduler(), DueDateBadgeProps, KIND_CLASSES (+6 more)

### Community 28 - "Markdown ↔ ProseMirror"
Cohesion: 0.15
Nodes (17): markdownToProsemirror(), paragraph(), parseInline(), PMDoc, PMMark, PMNode, textNode(), applyMarks() (+9 more)

### Community 29 - "Dashboard e painel em execução"
Cohesion: 0.09
Nodes (21): RunningNowPanel(), CATEGORY_COLORS, CATEGORY_LABELS, CategoryStats, CHART_COLORS, DailyStats, DashboardPage(), FLOW_COLORS (+13 more)

### Community 30 - "Hooks de dados e timerStore"
Cohesion: 0.16
Nodes (19): Hooks de dados via window.api, timerStore (Zustand), TimeEntryListProps, UseCalendarDataReturn, UseCalendarMonthReturn, UseTaskDetailReturn, MonthlyCalendarProps, WeeklyTimeGridProps (+11 more)

### Community 31 - "Assets de notas e export local"
Cohesion: 0.16
Nodes (19): createNoteAsset(), getNoteAsset(), buildFrontmatter(), copyAssets(), exportDrawing(), exportTaskToLocal(), yaml(), ASSET_SCHEME (+11 more)

### Community 32 - "Editor de desenho Excalidraw"
Cohesion: 0.14
Nodes (17): ensureExcalidrawAssetPath(), Window, clampNotesWidth(), DEFAULT_NOTES_WIDTH, DEFAULT_ZEN_WIDTH, MIN_DETAILS_SPACE, MIN_NOTES_WIDTH, NotesViewMode (+9 more)

### Community 33 - "Doc visão geral: padrões de UI"
Cohesion: 0.13
Nodes (21): Ações reveladas no hover, Cabeçalho de sub-página, Cartão de superfície (rounded-sm, design flat), Contexto, Diálogo de confirmação (AlertDialog / DeleteConfirmDialog), Visão geral (UI), EnergyLevel (nível de energia), Estado vazio (+13 more)

### Community 34 - "Doc biblioteca de componentes"
Cohesion: 0.12
Nodes (20): Biblioteca de componentes, Alerta de Time Leak (notificação a cada 5 min acima de 1h), ColorPicker, Exibição de tarefa (TaskCard, TaskList, TaskTable, TaskGroups, TaskKanban, TaskDialog), Componentes mortos (Versions, Timer), Lógica do DueDateBadge, Componentes do editor (Tiptap, Excalidraw), Hooks de interface (usePersistedState, useIncrementalList, useNotification) (+12 more)

### Community 35 - "Template bug report"
Cohesion: 0.10
Nodes (19): assignees, description, label, options, placeholder, render, value, body (+11 more)

### Community 36 - "Doc design tokens e badges"
Cohesion: 0.13
Nodes (19): CategoryBadge, StatusBadge, Design tokens — o que o código realmente usa, Animações (spin, pulse, ping, pulse-slow), Armadilha do rounded-sm (--radius 12px → 8px), ENERGY_COLORS (nível de energia), Escala Time Leak (fundo do card/linha), Espaçamento e larguras fixas (+11 more)

### Community 37 - "Template documentação"
Cohesion: 0.11
Nodes (18): assignees, description, label, options, placeholder, value, body, attributes (+10 more)

### Community 38 - "Template feature request"
Cohesion: 0.11
Nodes (18): assignees, description, label, options, placeholder, value, body, attributes (+10 more)

### Community 39 - "Queries de tags"
Cohesion: 0.15
Nodes (12): listTaskIdsWithTag(), mergeTags(), tagDb(), updateTag(), listTagsWithUsage(), listTaskIdsWithTag(), mergeTags(), SqliteLike (+4 more)

### Community 40 - "Config shadcn (components.json)"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 41 - "Conceitos de domínio da tarefa"
Cohesion: 0.15
Nodes (18): Bloco de tempo, Cronômetro de tarefas, Dependência / tarefa bloqueada, Subtarefa (parent_task_id), TaskCategory, Time Leak, Coloração Time Leak da linha/card, TaskList / TaskCard (modo cards) (+10 more)

### Community 42 - "Drag handle e menu de tabela"
Cohesion: 0.16
Nodes (15): @tiptap/extension-drag-handle-react@^3.28.0, @tiptap/react@^3.28.0, @tiptap/extension-drag-handle-react, @tiptap/react, BubbleToolbar(), FONT_SIZES, FontSizePicker(), buildExtensions() (+7 more)

### Community 43 - "API Google Calendar"
Cohesion: 0.16
Nodes (11): DesiredEvent, ExistingEvent, CalendarApi, CalendarApiDeps, createCalendarApi(), request(), GoogleApiError, Call (+3 more)

### Community 44 - "Doc calendário e filtros"
Cohesion: 0.12
Nodes (16): Painel de filtros, SearchableSelect, Sobreposição /today × /calendar × /horizons, CalendarPage, Criar bloco pela grade (snap 30 min), Diálogo de bloco de tempo, Calendário — /calendar, DraggableTaskChip (+8 more)

### Community 45 - "Scripts npm"
Cohesion: 0.12
Nodes (17): scripts, build, build:linux, build:mac, build:unpack, build:win, dev, dist (+9 more)

### Community 46 - "Doc projetos"
Cohesion: 0.17
Nodes (15): Projeto, Seção ORGANIZAÇÃO, Alerta 'Sem próxima ação definida', Cartão de projeto, ColorPicker, Diálogo Novo Projeto, Projetos — /projects e /project/:id, Outcome (resultado desejado) (+7 more)

### Community 47 - "Doc detalhe da tarefa"
Cohesion: 0.15
Nodes (15): Detalhe da tarefa — /task/:id, IPC drawing:save, Editor de desenho Excalidraw (React.lazy), Editor de notas Tiptap/ProseMirror, Esc ignorado com popup de sugestão aberto, Imagens via ticktask-asset://, Menções (@), Menu de barra (/) (+7 more)

### Community 48 - "Doc dashboard"
Cohesion: 0.18
Nodes (15): Dashboard — /dashboard, Análise de Energia, CHART_COLORS (paleta de 10 cores do dashboard), Exportar PDF (relatório semanal via printToPDF), Fluxo de Tarefas (Funil GTD), Heatmap de contribuições no último ano, Métricas GTD (Taxa do Inbox, Tempo Médio, Projetos Parados, Aguardando Paradas), Métricas do dashboard não clicáveis (+7 more)

### Community 49 - "Menções (@) Tiptap"
Cohesion: 0.18
Nodes (12): @tiptap/extension-mention@^3.28.0, @tiptap/suggestion@^3.28.0, react-dom@^19.1.1, react-dom, @tiptap/extension-mention, @tiptap/suggestion, MentionExtension, MentionEntry (+4 more)

### Community 50 - "OAuth Google (PKCE)"
Cohesion: 0.23
Nodes (10): buildAuthUrl(), createPkcePair(), exchangeCode(), GCAL_SCOPE, GoogleAuthRevokedError, OAuthClient, postToken(), refreshAccessToken() (+2 more)

### Community 51 - "Config e token MCP"
Cohesion: 0.30
Nodes (12): DEFAULT_BULK_THRESHOLD, DEFAULT_PORT, generateToken(), isPositiveInteger(), isUsablePort(), normalizeConfig(), configPath(), isMissingFileError() (+4 more)

### Community 52 - "Formato de notas (Editor.js)"
Cohesion: 0.29
Nodes (13): decodeEntities(), EditorJsBlock, EditorJsData, editorJsToProseMirror(), EMPTY_DOC, inlineFromHtml(), itemChecked(), itemText() (+5 more)

### Community 53 - "Doc inconsistências visuais"
Cohesion: 0.15
Nodes (14): Comparação Contextos vs Tags, Sombras (cinco intensidades), Status do projeto (pílula sólida), Inconsistências e pontos de atrito, A3. Duas gramáticas de badge, A5. Sombras sobreviveram à migração flat, B2. Botão Voltar com quatro implementações, B3. Ação primária em quatro cores (+6 more)

### Community 54 - "Doc janelas auxiliares e bandeja"
Cohesion: 0.19
Nodes (11): Janelas auxiliares (float, captura rápida, bandeja), Captura rápida (Ctrl/Cmd+Shift+Space), Evento tasks:refresh, Eventos float:update / float:clear / float:restore / float:stopTimer / float:stopAll, Geometria do float (300px, 44px por linha, máx 5), Menu da bandeja (Abrir, Captura rápida, Sair), Regra de visibilidade do float (minimizar/fechar mostra, restaurar/focar esconde), B5. Comportamento de fechar nunca explicado (+3 more)

### Community 55 - "tsconfig.web"
Cohesion: 0.17
Nodes (11): @electron-toolkit/tsconfig/tsconfig.web.json, compilerOptions, baseUrl, composite, jsx, paths, exclude, extends (+3 more)

### Community 56 - "Doc abas e preferências da lista"
Cohesion: 0.24
Nodes (11): Abas em pílula, Chaves localStorage (usePersistedState), Evento tasks:refresh, Abas de status (7 pílulas), Carregamento incremental (60 por vez, IntersectionObserver), Controles de visualização (Filtros/Cards-Tabela/Agrupar-Kanban), Lista de tarefas — /, TaskKanban (só aba Executando) (+3 more)

### Community 57 - "GTD e revisão semanal"
Cohesion: 0.22
Nodes (11): GTD (Getting Things Done), Revisão semanal (entidade), TaskStatus (ciclo de vida GTD), Checklist da Revisão (8 passos), Notas e conclusão (exige 8 itens), Revisão semanal — /review, Estado B — revisão em andamento, Estado A — nenhuma revisão em andamento (+3 more)

### Community 58 - "Doc plano do dia"
Cohesion: 0.20
Nodes (11): Botão 'Hoje' onipresente, Aba Esta Semana (DayColumn, somente leitura), Aba Hoje (lista ordenável @dnd-kit), Plano do dia — /today, getTasksForDate (tasks com horário primeiro), Indicador de carga (WORK_DAY_HOURS = 8), Persistência da ordem (updateDayOrder por tarefa), scheduled_date (critério de entrada em Hoje) (+3 more)

### Community 59 - "Doc contextos e tags"
Cohesion: 0.25
Nodes (11): Contextos e Tags — /contexts e /tags, Confirmação de exclusão de tag contextualizada, CONTEXT_COLORS / CONTEXT_ICONS (constantes locais), Contextos GTD, Mesclar tags, Preview ao vivo no diálogo de contexto, Tags (taxonomia livre), DeleteConfirmDialog (+3 more)

### Community 60 - "tsconfig.node"
Cohesion: 0.18
Nodes (10): @electron-toolkit/tsconfig/tsconfig.node.json, compilerOptions, baseUrl, composite, paths, types, exclude, extends (+2 more)

### Community 61 - "Mockup dashboard"
Cohesion: 0.22
Nodes (11): Dashboard Mockup, Arquivadas Button, Floating Running Timer Pill, GTD Task Status Workflow, Dashboard Header (logo, Arquivadas, Nova Tarefa), Nova Tarefa Button, Status Badge (color-coded), Status Filter Pills (Todas/Inbox/Aguardando/Proximas/Executando/Finalizadas) (+3 more)

### Community 62 - "Plano Fase 4 do roadmap"
Cohesion: 0.22
Nodes (10): GTD (Getting Things Done), TickTask (app Electron GTD), Roadmap Fase 4 — Visualizações e Análise (v3.3), Dashboard Avançado (métricas GTD, fluxo, energia), Entidade Area (Área de Foco), CalendarPage e Time Blocking, Entidade Goal (Objetivos), Horizontes GTD (H0–H5) (+2 more)

### Community 63 - "Doc horizontes (áreas/metas)"
Cohesion: 0.27
Nodes (10): Área de foco (H2), Meta / Visão / Propósito (H3–H5), area_id só gravável via MCP manage_structure, Diálogo Nova/Editar Área de Foco, Diálogo Novo/Editar Objetivo, Áreas e metas sem confirmação de exclusão, H2 — Áreas de Foco, H3/H4/H5 — Metas, Visão, Propósito (+2 more)

### Community 64 - "Doc arquivadas"
Cohesion: 0.20
Nodes (10): Arquivadas — /archived (Arquivo Morto), Arquivadas como filtro da lista principal, Arquivar (is_archived) vs finalizar, Limitações do Arquivo Morto (sem clique, busca, paginação, massa), C3. /archived é um filtro promovido a tela, D2. Arquivadas vs Arquivo Morto, F3. Persistência com duas convenções de nome (: e .), TickTask — Mapa da Interface (README) (+2 more)

### Community 65 - "Electron e previews de desenho"
Cohesion: 0.29
Nodes (8): electron@^38.1.2, electron, deleteDrawingPreview(), drawingPreviewPath(), drawingsDir(), readDrawingPreview(), saveDrawingPreview(), loadEffects()

### Community 66 - "Fila de sync gcal"
Cohesion: 0.22
Nodes (3): vitest, createKeyedQueue(), listModules()

### Community 67 - "Autostart e argumentos de launch"
Cohesion: 0.38
Nodes (8): autostartDir(), autostartFile(), desktopEntry(), isAutostartEnabled(), launcherPath(), setAutostartEnabled(), HIDDEN_FLAG, shouldStartHidden()

### Community 68 - "Código de conduta e contribuição"
Cohesion: 0.25
Nodes (7): Código de Conduta, Contributor Covenant 2.0, Guia de Contribuição, Template de Pull Request, README do TickTask, Licença MIT, Stack (Electron, React, TypeScript, Vite, shadcn, better-sqlite3)

### Community 69 - "Guia CLAUDE.md e fluxo Git"
Cohesion: 0.22
Nodes (6): CLAUDE.md (guia do projeto), Design tokens reais (docs/ui/14-design-tokens.md), graphify (grafo de conhecimento), Workflow de release (tags v*), RTK (Rust Token Killer), Builds por plataforma (AppImage/deb, NSIS, DMG)

### Community 70 - "Doc servidor MCP"
Cohesion: 0.31
Nodes (7): Servidor MCP embutido, Janelas (main, float, quick capture) e bandeja, Servidor MCP do TickTask (doc), bulkThreshold (padrão 5), Limitações conhecidas do MCP, HTTP em loopback com token Bearer, Ponte stdio (mcp-bridge)

### Community 71 - "Construtor de queries de tarefa"
Cohesion: 0.42
Nodes (6): buildTaskCountQuery(), buildTaskListQuery(), buildTaskListWhere(), escapeLike(), ORDER_BY, TaskSort

### Community 72 - "Doc janelas e casca de página"
Cohesion: 0.25
Nodes (9): Ícone de bandeja + atalho global Ctrl/Cmd+Shift+Space, Captura rápida (quick-capture), Casca de página (h-full, nunca h-screen), FloatingTimer / timer flutuante, Regras de exibição do float (processo principal), Tabela de rotas, Sub-página (oculta FloatingTimer), As três janelas (mesmo bundle do renderer) (+1 more)

### Community 73 - "Mockup TS"
Cohesion: 0.22
Nodes (3): Task, TaskStatus, TimeEntry

### Community 74 - "Ícone do app"
Cohesion: 0.25
Nodes (8): Vectorized TickTask logo (traced SVG), App icon 192px, App icon 32px, App icon 48px, App icon 512px, resources/icon.png (32px window/tray icon), Project assets sheet (Inkscape A4, logo variants), TickTask App Icon (clock pie + green checkmark)

### Community 75 - "Passos de setup (Configurações)"
Cohesion: 0.46
Nodes (5): SetupSteps(), ResolvedStep, resolveSteps(), StepDefinition, toggleStepDone()

### Community 76 - "Mockup detalhe da tarefa"
Cohesion: 0.36
Nodes (8): Ações Card (Arquivar/Deletar), Status 'Executando' (running, green accent), Header: Voltar + Status Select, Histórico de Sessões List, Mockup: Task Detail Single Page, Task Title & Description, Limite de Tempo Card, Large Timer Card (Pausar/Reset)

### Community 77 - "Segurança e armazenamento local"
Cohesion: 0.29
Nodes (4): Política de Segurança, Backup e restauração (snapshots), Sincronização com Google Calendar, Banco SQLite (ticktask.db, WAL, 13 tabelas)

### Community 78 - "Notas, desenho e Notion (CLAUDE.md)"
Cohesion: 0.38
Nodes (7): Desenho por task (Excalidraw), Sincronização com Notion, Notas ricas (Tiptap / ProseMirror JSON), Protocolo privilegiado ticktask-asset://, Tools MCP (search_tasks, get_task, create_task, timer, agenda, plan_day...), index.html do renderer, Content-Security-Policy do renderer

### Community 79 - "Config electron-vite"
Cohesion: 0.29
Nodes (6): @tailwindcss/vite@^4.1.17, electron-vite@^4.0.1, @vitejs/plugin-react@^5.0.3, electron-vite, @tailwindcss/vite, @vitejs/plugin-react

### Community 81 - "TagInput"
Cohesion: 0.43
Nodes (5): TagInput(), addTag(), handleKeyDown(), removeTag(), selectSuggestion()

### Community 82 - "Guard de janelas auxiliares"
Cohesion: 0.47
Nodes (4): Bundle do renderer compartilhado entre três janelas, F2. As três janelas compartilham o bundle, AUXILIARY_ROUTES, shouldBootstrapTimerStore()

### Community 84 - "dev-app-update.yml"
Cohesion: 0.50
Nodes (3): provider, updaterCacheDirName, url

## Ambiguous Edges - Review These
- `backup.ts` → `6.5 Backup e Exportação`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `initDatabase()` → `Sistema de migrations versionadas`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `googleCalendar.ts` → `5.2 Integração com Google Calendar / Outlook`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `setupIpcHandlers()` → `1.4 Captura Rápida Global`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `notion.ts` → `5.1 Melhoria da Integração com Notion`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `StatusBadge()` → `Cores semânticas de status (Emerald/Yellow/Blue/Purple/Red)`  [AMBIGUOUS]
  ui-ux/TickTask - Design System & Guia de Estilo.md · relation: references
- `useWeeklyReview()` → `1.5 Revisão Semanal Assistida`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `types.ts` → `Cores semânticas de status (Emerald/Yellow/Blue/Purple/Red)`  [AMBIGUOUS]
  ui-ux/TickTask - Design System & Guia de Estilo.md · relation: references
- `Modelo de branches (main/develop/feature/fix/hotfix)` → `Fluxo Git Production/Development com release branches`  [AMBIGUOUS]
  .github/CONTRIBUTING.md · relation: conceptually_related_to

## Knowledge Gaps
- **92 isolated node(s):** `@electron-toolkit/tsconfig/tsconfig.node.json`, `@electron-toolkit/tsconfig/tsconfig.web.json`, `Contributor Covenant 2.0`, `Template de Pull Request`, `Eventos main→renderer (tasks:refresh, float:update, notion:sync*)` (+87 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 516 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Primitivos UI e diálogos de confirmação` to `Dependências (package.json)`, `Lista de tarefas e badges`, `Tipos compartilhados e preload API`, `Seções de Configurações`, `TaskDialog e Horizontes`, `Badges de categoria e selects`, `App, rotas e eventos de sync`, `DevDependencies e ESLint`, `Página de Calendário`, `Extensões Tiptap e upload de imagem`, `Painel de notas e subtarefas`, `Dashboard e painel em execução`, `Hooks de dados e timerStore`, `Editor de desenho Excalidraw`, `Drag handle e menu de tabela`, `Menções (@) Tiptap`, `Mockup TS`, `Passos de setup (Configurações)`, `useTimer`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `@electron-toolkit/tsconfig/tsconfig.node.json`, `@electron-toolkit/tsconfig/tsconfig.web.json`, `Contributor Covenant 2.0` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Núcleo database.ts + index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04858987427794767 - nodes in this community are weakly interconnected._
- **Why does `TickTask — Mapa da Interface (README)` connect `Doc arquivadas` to `Doc biblioteca de componentes`, `Doc design tokens e badges`, `Guia CLAUDE.md e fluxo Git`, `Doc servidor MCP`, `Doc dashboard`, `Doc inconsistências visuais`, `Doc janelas auxiliares e bandeja`, `Doc Configurações e script de backup`, `Doc contextos e tags`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `Dependências (package.json)` be split into smaller, more focused modules?**
  _Cohesion score 0.04230769230769231 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `backup.ts` and `6.5 Backup e Exportação`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `initDatabase()` and `Sistema de migrations versionadas`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._