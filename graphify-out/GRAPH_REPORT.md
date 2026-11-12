# Graph Report - TickTask  (2026-11-12)

## Corpus Check
- 236 files · ~137,053 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 5, .css 2, .toml 1)

## Summary
- 2141 nodes · 5563 edges · 101 communities (94 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `aba1fcc8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main/index.ts
- Dependências (package.json)
- utils.ts
- types.ts
- Seções de Configurações
- Primitivos UI e diálogos de confirmação
- Roadmap e Design System
- TaskDialog e Horizontes
- notes.ts
- Tools MCP de estrutura
- Backup e planejamento de snapshot
- Badges de categoria e selects
- Desenho por task (Excalidraw)
- electron-builder
- DevDependencies e ESLint
- Página de Calendário
- steps
- vitest
- notion.ts
- Time blocks e efeitos MCP
- Extensões Tiptap e upload de imagem
- Bridge MCP (stdio)
- cn
- Google Calendar (Electron)
- Plano de eventos gcal
- ticktask-backup.sh
- DueDateBadge.tsx
- jira.ts
- Markdown ↔ ProseMirror
- lucide-react
- TaskStatus
- tagQueries.ts
- Editor de desenho Excalidraw
- Doc visão geral: padrões de UI
- Doc biblioteca de componentes
- Template bug report
- Doc design tokens e badges
- Template documentação
- Template feature request
- database.ts
- Config shadcn (components.json)
- Painel esquerdo — dados da tarefa (480px)
- confirmGuard.ts
- API Google Calendar
- Doc calendário e filtros
- Scripts npm
- Doc projetos
- Doc detalhe da tarefa
- Doc dashboard
- main.tsx
- OAuth Google (PKCE)
- Config e token MCP
- Formato de notas (Editor.js)
- Doc inconsistências visuais
- Doc janelas auxiliares e bandeja
- tsconfig.web
- TaskListPage (tela inicial)
- GTD e revisão semanal
- Doc plano do dia
- Doc contextos e tags
- tsconfig.node
- Mockup dashboard
- Plano Fase 4 do roadmap
- react
- env
- with
- moduleCasing.test.ts
- errorMessage
- Código de conduta e contribuição
- Guia CLAUDE.md e fluxo Git
- Doc servidor MCP
- Construtor de queries de tarefa
- Doc janelas e casca de página
- Mockup TS
- Ícone do app
- ci.yml
- Mockup detalhe da tarefa
- transport.ts
- with
- Config electron-vite
- SetupSteps.tsx
- Hooks de dados via window.api
- Guard de janelas auxiliares
- Round-trip renderer → preload → main → database
- dev-app-update.yml
- useTimer
- tsconfig raiz
- Logo Electron
- Fundo wavy-lines
- ticktask-backup.sh
- TickTask (app Electron GTD)
- Task
- markdownToProsemirror.ts
- Coluna central — timer herói
- release.yml
- jobs
- build
- permissions
- verify
- gcalSyncQueue.ts

## God Nodes (most connected - your core abstractions)
1. `setupIpcHandlers()` - 153 edges
2. `cn()` - 111 edges
3. `react` - 73 edges
4. `lucide-react` - 53 edges
5. `Button()` - 52 edges
6. `registerStructureTools()` - 49 edges
7. `Task` - 41 edges
8. `API` - 39 edges
9. `SingleTaskPage()` - 38 edges
10. `Visão geral (UI)` - 37 edges

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
- **Modos de layout do detalhe da tarefa** — docs_ui_02_detalhe_da_tarefa_notesviewmode, docs_ui_02_detalhe_da_tarefa_modo_zen, docs_ui_02_detalhe_da_tarefa_notesfocusbar, docs_ui_02_detalhe_da_tarefa_painel_de_notas, docs_ui_02_detalhe_da_tarefa_redimensionamento_notas [EXTRACTED 1.00]
- **Pilares GTD da Fase 1** — roadmap_projects_structure, roadmap_someday_maybe, roadmap_contexts, roadmap_quick_capture_global, roadmap_weekly_review [EXTRACTED 1.00]
- **Integrações externas da Fase 5** — roadmap_notion_bidirectional, roadmap_google_calendar_integration, roadmap_github_gitlab_integration, roadmap_slack_integration, roadmap_local_rest_api [EXTRACTED 1.00]
- **Modelo de horizontes GTD da Fase 4** — seguindo_o_plano_de_ação_do_roadmap_para_gtd_horizons, seguindo_o_plano_de_ação_do_roadmap_para_area_entity, seguindo_o_plano_de_ação_do_roadmap_para_goal_entity, seguindo_o_plano_de_ação_do_roadmap_para_horizonspage [EXTRACTED 1.00]
- **Consumidores do esquema ticktask-asset (notas, desenho, CSP)** — claude_ticktask_asset_protocol, claude_rich_notes_tiptap, claude_excalidraw_drawing, src_renderer_index_csp [EXTRACTED 1.00]
- **Telas que exibem tarefas de hoje** — docs_ui_03_plano_do_dia_todaypage, docs_ui_04_calendario_linha_dia, docs_ui_06_horizontes_h0_proximas_acoes, docs_ui_03_plano_do_dia_scheduled_date [EXTRACTED 1.00]
- **Três desenhos para timers em execução** — docs_ui_13_biblioteca_de_componentes_floatingtimer, docs_ui_08_dashboard_runningnowpanel, src_renderer_src_pages_floattimerpage, docs_ui_15_inconsistencias_c2_tres_desenhos_timers [EXTRACTED 1.00]
- **Snippets de componentes do design system** — ui_ux_ticktask___design_system___guia_de_estilo_button_variants, ui_ux_ticktask___design_system___guia_de_estilo_task_card_style, ui_ux_ticktask___design_system___guia_de_estilo_input_style, ui_ux_ticktask___design_system___guia_de_estilo_badges_pills, ui_ux_ticktask___design_system___guia_de_estilo_fab_active_task [EXTRACTED 1.00]
- **Integrações externas do TickTask (Notion, Google Calendar, MCP)** — claude_notion_sync, claude_google_calendar_sync, claude_mcp_server [INFERRED 0.75]
- **Sinais de saúde GTD** — docs_ui_07_revisao_semanal_healthcard, docs_ui_05_projetos_alerta_sem_proxima_acao, docs_ui_05_projetos_proxima_acao, docs_ui_07_revisao_semanal_inbox_cleared [INFERRED 0.85]
- **Guarda do bundle compartilhado entre janelas** — docs_ui_12_janelas_auxiliares_bundle_compartilhado, docs_ui_15_inconsistencias_f2_bundle_compartilhado, src_renderer_src_stores_timerwindow, docs_ui_13_biblioteca_de_componentes_timerstore_estado [INFERRED 0.85]
- **Paletas de cor divergentes/duplicadas** — docs_ui_14_design_tokens_paleta_status_tarefa, docs_ui_14_design_tokens_paleta_categoria, docs_ui_08_dashboard_chart_colors, docs_ui_09_contextos_e_tags_context_colors, docs_ui_14_design_tokens_default_colors, docs_ui_15_inconsistencias_a1_paletas_status_categoria, docs_ui_15_inconsistencias_a2_exports_cor_mortos [INFERRED 0.85]
- **Live timer presentation across card, badge and floating pill** — ui_ux_dashboard_task_timer_display, ui_ux_dashboard_status_badge, ui_ux_dashboard_floating_timer_pill [INFERRED 0.85]
- **Task time-tracking flow (timer, limit, session history)** — ui_ux_single_page_timer_card, ui_ux_single_page_time_limit_card, ui_ux_single_page_session_history [INFERRED 0.85]

## Communities (101 total, 7 thin omitted)

### Community 0 - "main/index.ts"
Cohesion: 0.07
Nodes (36): getCategoryStats(), getTask(), listGcalSyncedTaskIds(), syncAllToGoogle(), syncTaskToGoogle, autoSyncTask(), autoSyncToGoogle(), autoSyncToNotion() (+28 more)

### Community 1 - "Dependências (package.json)"
Cohesion: 0.04
Nodes (61): author, dependencies, better-sqlite3@^12.5.0, class-variance-authority@^0.7.1, clsx@^2.1.1, @dnd-kit/core@^6.3.1, @dnd-kit/sortable@^10.0.0, @dnd-kit/utilities@^3.2.2 (+53 more)

### Community 2 - "utils.ts"
Cohesion: 0.15
Nodes (24): CategoryBadge(), DueDateBadge(), ScheduledTimeBadge(), StatusBadge(), statusStyles, getTimeLeakVisual(), TaskCard(), todayStr() (+16 more)

### Community 3 - "types.ts"
Cohesion: 0.08
Nodes (55): api, CategoryStats, API, CategoryStats, DailyStats, FloatTimerData, GeneralStats, HeatmapData (+47 more)

### Community 4 - "Seções de Configurações"
Cohesion: 0.10
Nodes (31): AboutSection(), GeneralSection(), AUTO_IMPORT_OPTIONS, CATEGORY_LABELS, JiraSection(), handleLoadBoards(), handleSave(), LOCAL_STATUSES (+23 more)

### Community 5 - "Primitivos UI e diálogos de confirmação"
Cohesion: 0.10
Nodes (45): DeleteConfirmDialog(), DeleteConfirmDialogProps, DependencySelector(), NotesActions(), NotesActionsProps, NotesFocusBar(), GoogleCalendarTaskToggle(), TaskGroup (+37 more)

### Community 6 - "Roadmap e Design System"
Cohesion: 0.05
Nodes (50): TickTask Roadmap GTD, 4.2 Dashboard Avançado / Energy Tracking, 3.2 Sugestão de Próxima Ação via Claude API, 6.5 Backup e Exportação, 4.3 Visão de Calendário e Time Blocking, 1.3 Contextos, 2.1 Planejamento Diário (TodayPage), 2.5 Datas de Entrega e Alertas (+42 more)

### Community 7 - "TaskDialog e Horizontes"
Cohesion: 0.16
Nodes (36): ColorPicker(), TaskDialog(), Button(), Dialog(), DialogContent(), DialogDescription(), DialogFooter(), DialogHeader() (+28 more)

### Community 8 - "notes.ts"
Cohesion: 0.24
Nodes (14): @modelcontextprotocol/sdk, readDrawingPreview(), ErrorCode, ok(), okImage(), createMcpServer(), describeElements(), DrawingElement (+6 more)

### Community 9 - "Tools MCP de estrutura"
Cohesion: 0.07
Nodes (61): countTasks(), createProject(), deleteArea(), deleteContext(), deleteGoal(), deleteProject(), deleteTag(), enrichProject() (+53 more)

### Community 10 - "Backup e planejamento de snapshot"
Cohesion: 0.13
Nodes (35): BackupConfig, chooseBackupFolder(), chooseSnapshotFolder(), configPath(), createBackup(), dataDir(), describeSnapshot(), getBackupStatus() (+27 more)

### Community 11 - "Badges de categoria e selects"
Cohesion: 0.13
Nodes (28): CategoryBadgeProps, categoryIcons, categoryStyles, categoryIcons, CategorySelect(), CategorySelectProps, categoryStyles, ColorPickerProps (+20 more)

### Community 12 - "Desenho por task (Excalidraw)"
Cohesion: 0.47
Nodes (6): Desenho por task (Excalidraw), Notas ricas (Tiptap / ProseMirror JSON), Protocolo privilegiado ticktask-asset://, Tools MCP (search_tasks, get_task, create_task, timer, agenda, plan_day...), index.html do renderer, Content-Security-Policy do renderer

### Community 13 - "electron-builder"
Cohesion: 0.06
Nodes (33): appId, appImage, artifactName, asarUnpack, deb, afterInstall, afterRemove, artifactName (+25 more)

### Community 14 - "DevDependencies e ESLint"
Cohesion: 0.06
Nodes (36): devDependencies, electron@^38.1.2, electron-builder@^25.1.8, @electron-toolkit/eslint-config-prettier@^3.0.0, @electron-toolkit/eslint-config-ts@^3.1.0, @electron-toolkit/tsconfig@^2.0.0, eslint@^9.36.0, eslint-plugin-react@^7.37.5 (+28 more)

### Community 15 - "Página de Calendário"
Cohesion: 0.11
Nodes (28): @dnd-kit/core, useCalendarMonth(), useCalendarWeek(), CalendarPage(), goToToday(), nextPeriod(), periodLabel(), prevPeriod() (+20 more)

### Community 16 - "steps"
Cohesion: 0.22
Nodes (13): steps, GH_TOKEN, PRERELEASE, TAG, VERSION, steps, env, id (+5 more)

### Community 17 - "vitest"
Cohesion: 0.36
Nodes (4): vitest, ExternalLinkField(), ExternalLinkFieldProps, isSafeHttpUrl()

### Community 18 - "notion.ts"
Cohesion: 0.05
Nodes (74): @notionhq/client, createNoteAsset(), getNoteAsset(), setNoteAssetUpload(), deleteDrawingPreview(), drawingPreviewPath(), drawingsDir(), saveDrawingPreview() (+66 more)

### Community 19 - "Time blocks e efeitos MCP"
Cohesion: 0.08
Nodes (52): electron, zod, archiveTask(), countTimeBlocksForTask(), createTimeBlock(), createWeeklyReview(), deleteTasks(), deleteTimeBlock() (+44 more)

### Community 20 - "Extensões Tiptap e upload de imagem"
Cohesion: 0.07
Nodes (33): @tiptap/extension-drag-handle-react@^3.28.0, @tiptap/extension-file-handler@^3.28.0, @tiptap/extension-highlight@^3.28.0, @tiptap/extension-image@^3.28.0, @tiptap/extension-list@^3.28.0, @tiptap/extension-table@^3.28.0, @tiptap/extension-text-style@3.28.0, @tiptap/extensions@^3.28.0 (+25 more)

### Community 21 - "Bridge MCP (stdio)"
Cohesion: 0.09
Nodes (31): autostartDir(), autostartFile(), desktopEntry(), isAutostartEnabled(), launcherPath(), setAutostartEnabled(), HIDDEN_FLAG, shouldStartHidden() (+23 more)

### Community 22 - "cn"
Cohesion: 0.08
Nodes (30): class-variance-authority, react, DependencySelectorProps, NotesFocusBarProps, SubtaskList(), SubtaskListProps, TagInput(), addTag() (+22 more)

### Community 23 - "Google Calendar (Electron)"
Cohesion: 0.19
Nodes (24): getTimeBlocksForTask(), api, configPath(), connectGcal(), disconnectGcal(), getAccessToken(), getGcalStatus(), isConnected() (+16 more)

### Community 24 - "Plano de eventos gcal"
Cohesion: 0.13
Nodes (20): allDay(), buildDesiredEvents(), describeTask(), EventTime, GcalBlockInput, GcalOp, GcalTaskInput, isUpToDate() (+12 more)

### Community 25 - "ticktask-backup.sh"
Cohesion: 0.19
Nodes (13): Configurações — /settings, Barra lateral de Configurações (settings.section persistida), Peças compartilhadas (SectionHeader, ToggleRow, StatusPill, OutLink, Callout), Preferências ausentes (aparência, comportamento, backup automático), Seção Backup (snapshot, restauração), Seção Geral (autostart, bandeja, atalho), Seção Google Calendar, Seção Notion (+5 more)

### Community 26 - "DueDateBadge.tsx"
Cohesion: 0.15
Nodes (14): DueNotification, DueTaskLike, minutesOfDay(), pickDueNotifications(), checkDueDateNotifications(), startNotificationScheduler(), DueDateBadgeProps, KIND_CLASSES (+6 more)

### Community 27 - "jira.ts"
Cohesion: 0.07
Nodes (56): createJiraLinkedTask(), listJiraLinkedTasks(), setTaskJiraStatus(), updateJiraLinkedTask(), apiFor(), applyImportOp(), collectKnownStatuses(), configPath() (+48 more)

### Community 28 - "Markdown ↔ ProseMirror"
Cohesion: 0.27
Nodes (11): applyMarks(), blockToMarkdown(), cellText(), firstParagraphInline(), listToMarkdown(), PMMark, PMNode, prosemirrorToMarkdown() (+3 more)

### Community 29 - "lucide-react"
Cohesion: 0.05
Nodes (53): SyncNotification, lucide-react, react-router-dom, App(), AppContent(), eventEmitter, FloatContent(), QuickCaptureContent() (+45 more)

### Community 30 - "TaskStatus"
Cohesion: 0.27
Nodes (9): JiraTaskFields, StatusBadgeProps, StatusSelectProps, TimeEntryListProps, UseTaskDetailReturn, ActiveTimer, TaskStatus, TimeEntry (+1 more)

### Community 31 - "tagQueries.ts"
Cohesion: 0.15
Nodes (13): listTagsWithUsage(), listTaskIdsWithTag(), mergeTags(), tagDb(), updateTag(), listTagsWithUsage(), listTaskIdsWithTag(), mergeTags() (+5 more)

### Community 32 - "Editor de desenho Excalidraw"
Cohesion: 0.11
Nodes (22): @excalidraw/excalidraw@^0.18.1, @excalidraw/excalidraw, ensureExcalidrawAssetPath(), Window, clampNotesWidth(), DEFAULT_NOTES_WIDTH, DEFAULT_ZEN_WIDTH, MIN_DETAILS_SPACE (+14 more)

### Community 33 - "Doc visão geral: padrões de UI"
Cohesion: 0.10
Nodes (26): Ações reveladas no hover, Cabeçalho de sub-página, Cartão de superfície (rounded-sm, design flat), Contexto, Diálogo de confirmação (AlertDialog / DeleteConfirmDialog), Visão geral (UI), EnergyLevel (nível de energia), Estado vazio (+18 more)

### Community 34 - "Doc biblioteca de componentes"
Cohesion: 0.12
Nodes (19): Biblioteca de componentes, Alerta de Time Leak (notificação a cada 5 min acima de 1h), ColorPicker, Exibição de tarefa (TaskCard, TaskList, TaskTable, TaskGroups, TaskKanban, TaskDialog), Componentes mortos (Versions, Timer), Lógica do DueDateBadge, Componentes do editor (Tiptap, Excalidraw), Hooks de interface (usePersistedState, useIncrementalList, useNotification) (+11 more)

### Community 35 - "Template bug report"
Cohesion: 0.10
Nodes (19): assignees, description, label, options, placeholder, render, value, body (+11 more)

### Community 36 - "Doc design tokens e badges"
Cohesion: 0.14
Nodes (18): CategoryBadge, StatusBadge, Design tokens — o que o código realmente usa, Animações (spin, pulse, ping, pulse-slow), Armadilha do rounded-sm (--radius 12px → 8px), ENERGY_COLORS (nível de energia), Espaçamento e larguras fixas, --font-geist-sans/mono indefinidas (+10 more)

### Community 37 - "Template documentação"
Cohesion: 0.11
Nodes (18): assignees, description, label, options, placeholder, value, body, attributes (+10 more)

### Community 38 - "Template feature request"
Cohesion: 0.11
Nodes (18): assignees, description, label, options, placeholder, value, body, attributes (+10 more)

### Community 39 - "database.ts"
Cohesion: 0.05
Nodes (76): addManualTimeEntry(), addTaskDependency(), calculateNextDate(), CategoryStats, closeDatabase(), completeSubtasksCheck(), ContextRow, createArea() (+68 more)

### Community 40 - "Config shadcn (components.json)"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 41 - "Painel esquerdo — dados da tarefa (480px)"
Cohesion: 0.16
Nodes (18): Dependência / tarefa bloqueada, Subtarefa (parent_task_id), TaskCategory, Time Leak, Coloração Time Leak da linha/card, Lista de tarefas — /, Painel de filtros, SearchableSelect (+10 more)

### Community 42 - "confirmGuard.ts"
Cohesion: 0.16
Nodes (8): ALWAYS_CONFIRM, ConfirmStore, createConfirmStore(), GuardedKind, PendingOperation, OP, storeAt(), ToolContext

### Community 43 - "API Google Calendar"
Cohesion: 0.15
Nodes (12): DesiredEvent, ExistingEvent, CalendarApi, CalendarApiDeps, createCalendarApi(), request(), GoogleApiError, Call (+4 more)

### Community 44 - "Doc calendário e filtros"
Cohesion: 0.18
Nodes (11): Sobreposição /today × /calendar × /horizons, CalendarPage, Criar bloco pela grade (snap 30 min), Diálogo de bloco de tempo, Calendário — /calendar, Geometria da grade (1h = 72px), Legenda do calendário, Linha 'Dia' (all-day) (+3 more)

### Community 45 - "Scripts npm"
Cohesion: 0.12
Nodes (17): scripts, build, build:linux, build:mac, build:unpack, build:win, dev, dist (+9 more)

### Community 46 - "Doc projetos"
Cohesion: 0.27
Nodes (10): Alerta 'Sem próxima ação definida', Cartão de projeto, ColorPicker, Diálogo Novo Projeto, Projetos — /projects e /project/:id, Outcome (resultado desejado), ProjectDetailPage, ProjectsPage (+2 more)

### Community 47 - "Doc detalhe da tarefa"
Cohesion: 0.14
Nodes (16): Contenção de altura h-full, Detalhe da tarefa — /task/:id, IPC drawing:save, Editor de desenho Excalidraw (React.lazy), Editor de notas Tiptap/ProseMirror, Esc ignorado com popup de sugestão aberto, Imagens via ticktask-asset://, Menções (@) (+8 more)

### Community 48 - "Doc dashboard"
Cohesion: 0.18
Nodes (15): Dashboard — /dashboard, Análise de Energia, CHART_COLORS (paleta de 10 cores do dashboard), Exportar PDF (relatório semanal via printToPDF), Fluxo de Tarefas (Funil GTD), Heatmap de contribuições no último ano, Métricas GTD (Taxa do Inbox, Tempo Médio, Projetos Parados, Aguardando Paradas), Métricas do dashboard não clicáveis (+7 more)

### Community 49 - "main.tsx"
Cohesion: 0.14
Nodes (17): @tiptap/extension-mention@^3.28.0, @tiptap/suggestion@^3.28.0, @tiptap/extension-mention, @tiptap/suggestion, pickImageFile(), MentionExtension, MentionEntry, MentionList() (+9 more)

### Community 50 - "OAuth Google (PKCE)"
Cohesion: 0.21
Nodes (11): buildAuthUrl(), createPkcePair(), exchangeCode(), GCAL_SCOPE, GoogleAuthRevokedError, OAuthClient, postToken(), refreshAccessToken() (+3 more)

### Community 51 - "Config e token MCP"
Cohesion: 0.30
Nodes (12): DEFAULT_BULK_THRESHOLD, DEFAULT_PORT, generateToken(), isPositiveInteger(), isUsablePort(), normalizeConfig(), configPath(), isMissingFileError() (+4 more)

### Community 52 - "Formato de notas (Editor.js)"
Cohesion: 0.29
Nodes (13): decodeEntities(), EditorJsBlock, EditorJsData, editorJsToProseMirror(), EMPTY_DOC, inlineFromHtml(), itemChecked(), itemText() (+5 more)

### Community 53 - "Doc inconsistências visuais"
Cohesion: 0.10
Nodes (24): Comparação Contextos vs Tags, Arquivadas — /archived (Arquivo Morto), Arquivadas como filtro da lista principal, Arquivar (is_archived) vs finalizar, Limitações do Arquivo Morto (sem clique, busca, paginação, massa), Sombras (cinco intensidades), Status do projeto (pílula sólida), Inconsistências e pontos de atrito (+16 more)

### Community 54 - "Doc janelas auxiliares e bandeja"
Cohesion: 0.27
Nodes (10): Janelas auxiliares (float, captura rápida, bandeja), Captura rápida (Ctrl/Cmd+Shift+Space), Evento tasks:refresh, Eventos float:update / float:clear / float:restore / float:stopTimer / float:stopAll, Geometria do float (300px, 44px por linha, máx 5), Menu da bandeja (Abrir, Captura rápida, Sair), Regra de visibilidade do float (minimizar/fechar mostra, restaurar/focar esconde), Escala Time Leak (fundo do card/linha) (+2 more)

### Community 55 - "tsconfig.web"
Cohesion: 0.17
Nodes (11): @electron-toolkit/tsconfig/tsconfig.web.json, compilerOptions, baseUrl, composite, jsx, paths, exclude, extends (+3 more)

### Community 56 - "TaskListPage (tela inicial)"
Cohesion: 0.33
Nodes (7): Abas em pílula, Chaves localStorage (usePersistedState), Abas de status (7 pílulas), Controles de visualização (Filtros/Cards-Tabela/Agrupar-Kanban), TaskKanban (só aba Executando), Redimensionamento do painel (notesLayout.ts), Abas de status de projetos (com contador)

### Community 57 - "GTD e revisão semanal"
Cohesion: 0.25
Nodes (9): TaskStatus (ciclo de vida GTD), Checklist da Revisão (8 passos), Notas e conclusão (exige 8 itens), Estado B — revisão em andamento, Estado A — nenhuma revisão em andamento, HealthCard — indicadores de saúde, Histórico de Revisões, inbox_cleared / badge Inbox Zero (+1 more)

### Community 58 - "Doc plano do dia"
Cohesion: 0.15
Nodes (14): Botão 'Hoje' onipresente, Aba Esta Semana (DayColumn, somente leitura), Aba Hoje (lista ordenável @dnd-kit), Plano do dia — /today, getTasksForDate (tasks com horário primeiro), Indicador de carga (WORK_DAY_HOURS = 8), Persistência da ordem (updateDayOrder por tarefa), scheduled_date (critério de entrada em Hoje) (+6 more)

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
Cohesion: 0.29
Nodes (6): Sincronização com Google Calendar, Sincronização com Notion, Roadmap Fase 4 — Visualizações e Análise (v3.3), Dashboard Avançado (métricas GTD, fluxo, energia), CalendarPage e Time Blocking, Mapa Mental de Projetos (react-flow)

### Community 63 - "react"
Cohesion: 0.25
Nodes (11): Área de foco (H2), Meta / Visão / Propósito (H3–H5), Projeto, area_id só gravável via MCP manage_structure, Diálogo Nova/Editar Área de Foco, Diálogo Novo/Editar Objetivo, H1 — Projetos, H2 — Áreas de Foco (+3 more)

### Community 64 - "env"
Cohesion: 0.07
Nodes (27): runs-on, steps, BASE_REF, GITHUB_TOKEN, HEAD_REF, jobs, branch-name, pr-title (+19 more)

### Community 65 - "with"
Cohesion: 0.08
Nodes (27): permissions, runs-on, steps, if, permissions, runs-on, steps, jobs (+19 more)

### Community 67 - "errorMessage"
Cohesion: 0.14
Nodes (23): BackupSection(), askRestore(), backupNow(), chooseFolder(), confirmRestore(), restoreFromOtherFolder(), describeCounts(), formatDate() (+15 more)

### Community 68 - "Código de conduta e contribuição"
Cohesion: 0.22
Nodes (6): Código de Conduta, Contributor Covenant 2.0, Guia de Contribuição, README do TickTask, Licença MIT, Stack (Electron, React, TypeScript, Vite, shadcn, better-sqlite3)

### Community 69 - "Guia CLAUDE.md e fluxo Git"
Cohesion: 0.29
Nodes (6): CLAUDE.md (guia do projeto), Design tokens reais (docs/ui/14-design-tokens.md), graphify (grafo de conhecimento), Workflow de release (tags v*), RTK (Rust Token Killer), Builds por plataforma (AppImage/deb, NSIS, DMG)

### Community 70 - "Doc servidor MCP"
Cohesion: 0.31
Nodes (7): Servidor MCP embutido, Janelas (main, float, quick capture) e bandeja, Servidor MCP do TickTask (doc), bulkThreshold (padrão 5), Limitações conhecidas do MCP, HTTP em loopback com token Bearer, Ponte stdio (mcp-bridge)

### Community 71 - "Construtor de queries de tarefa"
Cohesion: 0.42
Nodes (6): buildTaskCountQuery(), buildTaskListQuery(), buildTaskListWhere(), escapeLike(), ORDER_BY, TaskSort

### Community 72 - "Doc janelas e casca de página"
Cohesion: 0.29
Nodes (8): Ícone de bandeja + atalho global Ctrl/Cmd+Shift+Space, Captura rápida (quick-capture), Casca de página (h-full, nunca h-screen), FloatingTimer / timer flutuante, Regras de exibição do float (processo principal), Tabela de rotas, Sub-página (oculta FloatingTimer), As três janelas (mesmo bundle do renderer)

### Community 73 - "Mockup TS"
Cohesion: 0.22
Nodes (3): Task, TaskStatus, TimeEntry

### Community 74 - "Ícone do app"
Cohesion: 0.25
Nodes (8): Vectorized TickTask logo (traced SVG), App icon 192px, App icon 32px, App icon 48px, App icon 512px, resources/icon.png (32px window/tray icon), Project assets sheet (Inkscape A4, logo variants), TickTask App Icon (clock pie + green checkmark)

### Community 75 - "ci.yml"
Cohesion: 0.09
Nodes (21): concurrency, cancel-in-progress, group, jobs, test, name, on, pull_request (+13 more)

### Community 76 - "Mockup detalhe da tarefa"
Cohesion: 0.36
Nodes (8): Ações Card (Arquivar/Deletar), Status 'Executando' (running, green accent), Header: Voltar + Status Select, Histórico de Sessões List, Mockup: Task Detail Single Page, Task Title & Description, Limite de Tempo Card, Large Timer Card (Pausar/Reset)

### Community 77 - "transport.ts"
Cohesion: 0.30
Nodes (8): McpConfig, handleMcpRequest(), isAuthorized(), isMcpRunning(), performStart(), startMcpServer(), stopMcpServer(), TOKEN

### Community 78 - "with"
Cohesion: 0.17
Nodes (12): with, cache, fetch-depth, if-no-files-found, merge-multiple, name, node-version, path (+4 more)

### Community 79 - "Config electron-vite"
Cohesion: 0.29
Nodes (6): @tailwindcss/vite@^4.1.17, electron-vite@^4.0.1, @vitejs/plugin-react@^5.0.3, electron-vite, @tailwindcss/vite, @vitejs/plugin-react

### Community 80 - "SetupSteps.tsx"
Cohesion: 0.38
Nodes (6): SetupSteps(), ResolvedStep, resolveSteps(), StepDefinition, toggleStepDone(), usePersistedState()

### Community 81 - "Hooks de dados via window.api"
Cohesion: 0.29
Nodes (6): Hooks de dados via window.api, Evento tasks:refresh, timerStore (Zustand), Carregamento incremental (60 por vez, IntersectionObserver), useIncrementalList(), UseIncrementalListReturn

### Community 82 - "Guard de janelas auxiliares"
Cohesion: 0.47
Nodes (4): Bundle do renderer compartilhado entre três janelas, F2. As três janelas compartilham o bundle, AUXILIARY_ROUTES, shouldBootstrapTimerStore()

### Community 83 - "Round-trip renderer → preload → main → database"
Cohesion: 0.20
Nodes (4): Política de Segurança, Backup e restauração (snapshots), Eventos main→renderer (tasks:refresh, float:update, notion:sync*), Banco SQLite (ticktask.db, WAL, 13 tabelas)

### Community 84 - "dev-app-update.yml"
Cohesion: 0.50
Nodes (3): provider, updaterCacheDirName, url

### Community 90 - "ticktask-backup.sh"
Cohesion: 0.41
Nodes (11): app_running(), cmd_backup(), cmd_list(), cmd_restore(), die(), info(), list_snapshots(), require_python() (+3 more)

### Community 91 - "TickTask (app Electron GTD)"
Cohesion: 0.40
Nodes (6): GTD (Getting Things Done), TickTask (app Electron GTD), Entidade Area (Área de Foco), Entidade Goal (Objetivos), Horizontes GTD (H0–H5), HorizonsPage (visão em camadas)

### Community 92 - "Task"
Cohesion: 0.17
Nodes (17): TaskCardProps, TaskDialogProps, UseCalendarDataReturn, UseCalendarMonthReturn, UseTasksReturn, DraggableTaskChipProps, DroppableDayCellProps, MonthlyCalendarProps (+9 more)

### Community 93 - "markdownToProsemirror.ts"
Cohesion: 0.36
Nodes (7): markdownToProsemirror(), paragraph(), parseInline(), PMDoc, PMMark, PMNode, textNode()

### Community 94 - "Coluna central — timer herói"
Cohesion: 0.40
Nodes (6): Bloco de tempo, Cronômetro de tarefas, Ajustes de tempo (adicionar/ajustar/limite), Barra de progresso do limite (notificação única), Coluna central — timer herói, TimeBlockCard

### Community 95 - "release.yml"
Cohesion: 0.25
Nodes (7): concurrency, cancel-in-progress, group, name, on, push, tags

### Community 96 - "jobs"
Cohesion: 0.29
Nodes (7): needs, uses, jobs, ci, publish, needs, runs-on

### Community 97 - "build"
Cohesion: 0.33
Nodes (6): needs, runs-on, strategy, build, os, matrix

### Community 98 - "permissions"
Cohesion: 0.33
Nodes (6): permissions, permissions, attestations, contents, id-token, permissions

### Community 99 - "verify"
Cohesion: 0.33
Nodes (6): verify, base, prerelease, version, outputs, runs-on

## Ambiguous Edges - Review These
- `initDatabase()` → `Sistema de migrations versionadas`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `setupIpcHandlers()` → `1.4 Captura Rápida Global`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `types.ts` → `Cores semânticas de status (Emerald/Yellow/Blue/Purple/Red)`  [AMBIGUOUS]
  ui-ux/TickTask - Design System & Guia de Estilo.md · relation: references
- `StatusBadge()` → `Cores semânticas de status (Emerald/Yellow/Blue/Purple/Red)`  [AMBIGUOUS]
  ui-ux/TickTask - Design System & Guia de Estilo.md · relation: references
- `useWeeklyReview()` → `1.5 Revisão Semanal Assistida`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `backup.ts` → `6.5 Backup e Exportação`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `notion.ts` → `5.1 Melhoria da Integração com Notion`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `googleCalendar.ts` → `5.2 Integração com Google Calendar / Outlook`  [AMBIGUOUS]
  ROADMAP.md · relation: references
- `Modelo de branches (main/develop/feature/fix/hotfix)` → `Fluxo Git Production/Development com release branches`  [AMBIGUOUS]
  .github/CONTRIBUTING.md · relation: conceptually_related_to

## Knowledge Gaps
- **91 isolated node(s):** `@electron-toolkit/tsconfig/tsconfig.web.json`, `@electron-toolkit/tsconfig/tsconfig.node.json`, `Peças compartilhadas (SectionHeader, ToggleRow, StatusPill, OutLink, Callout)`, `Seção Geral (autostart, bandeja, atalho)`, `Seção Servidor MCP` (+86 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 596 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `cn` to `Dependências (package.json)`, `utils.ts`, `types.ts`, `Seções de Configurações`, `Primitivos UI e diálogos de confirmação`, `TaskDialog e Horizontes`, `Badges de categoria e selects`, `DevDependencies e ESLint`, `Página de Calendário`, `vitest`, `Extensões Tiptap e upload de imagem`, `lucide-react`, `TaskStatus`, `Editor de desenho Excalidraw`, `main.tsx`, `errorMessage`, `Mockup TS`, `SetupSteps.tsx`, `Hooks de dados via window.api`, `useTimer`, `Task`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **What connects `@electron-toolkit/tsconfig/tsconfig.web.json`, `@electron-toolkit/tsconfig/tsconfig.node.json`, `Peças compartilhadas (SectionHeader, ToggleRow, StatusPill, OutLink, Callout)` to the rest of the system?**
  _91 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07419712070874862 - nodes in this community are weakly interconnected._
- **Why does `TickTask — Mapa da Interface (README)` connect `Doc inconsistências visuais` to `Doc biblioteca de componentes`, `Doc design tokens e badges`, `Guia CLAUDE.md e fluxo Git`, `Doc servidor MCP`, `Doc dashboard`, `Doc janelas auxiliares e bandeja`, `ticktask-backup.sh`, `Doc contextos e tags`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `Dependências (package.json)` be split into smaller, more focused modules?**
  _Cohesion score 0.04389212057112639 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `initDatabase()` and `Sistema de migrations versionadas`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `setupIpcHandlers()` and `1.4 Captura Rápida Global`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._