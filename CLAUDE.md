# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TickTask is an Electron desktop app for personal task and time tracking, organized around GTD (Getting Things Done) concepts: an inbox, contexts, projects, areas, goals/horizons, weekly reviews, plus time tracking, recurring tasks, subtasks, and task dependencies. Local-first with SQLite; optional one-way+ sync to Notion. UI strings, task statuses, and categories are in Portuguese (e.g. status `inbox`/`aguardando`/`proximas`/`executando`/`finalizada`/`someday`).

## Commands

```bash
npm run dev          # Run app with hot reload (electron-vite)
npm run build        # typecheck (node + web) then build to out/
npm run typecheck    # tsc for both tsconfig.node.json and tsconfig.web.json
npm run lint         # eslint --cache
npm run format       # prettier --write
npm run start        # preview a built app
npm run test         # vitest run (config em vitest.config.ts, environment node)
npm run test:watch   # vitest in watch mode
npm run build:linux  # package AppImage + .deb  (also build:win / build:mac / dist)
npm run build:unpack # build + electron-builder --dir (no installer)
```

Single test file / single case:

```bash
npx vitest run src/main/taskQuery.test.ts
npx vitest run src/main/taskQuery.test.ts -t "nome do caso"
npm run typecheck:node   # or typecheck:web — narrow the tsc run while iterating
```

Tests run on **vitest** (`vitest.config.ts`, `environment: 'node'`, include `src/**/*.test.ts`) and
cover the pure modules — query building (`taskQuery`), tag merge/rename (`tagQueries`),
ProseMirror↔Markdown (`notesMarkdown`), ProseMirror→Notion blocks (`notionBlocks`), note
format/layout math, and the auxiliary-window guard (`timerWindow`). Anything that imports
`electron` or `better-sqlite3` is not testable as-is; extract the logic into a pure module next to
it (as `src/main/taskQuery.ts` does for `database.ts`, or `tagQueries.ts` does by taking an
injected `SqliteLike`) and test that.

The build runs `typecheck` first, so a type error fails the build. After meaningful changes run `npm run typecheck && npm run lint` to validate.

`npm run lint` reports pre-existing prettier warnings across the repo. Do **not** run
`prettier --write` on a whole legacy file to silence them — it rewrites hundreds of untouched lines
and buries the real diff. Format only the files you created.

## Architecture

Standard electron-vite three-context layout. Understanding the **data round-trip** matters more than any single file:

```
renderer (React)  →  preload (window.api)  →  main (ipcMain.handle)  →  database.ts (SQLite)
   src/renderer/src      src/preload/index.ts      src/main/index.ts        src/main/database.ts
```

- **src/main/** — Node side. `index.ts` (windows, lifecycle, ~108 `ipcMain.handle` registrations in `setupIpcHandlers()`, global shortcut, PDF export via `webContents.printToPDF`). `database.ts` owns the schema + every query as an exported function. `notion.ts` is the Notion client/sync. Around it sit the pure/leaf modules: `taskQuery.ts` (WHERE/ORDER builder), `tagQueries.ts` (tag CRUD/merge over an injected `SqliteLike`), `notesMarkdown.ts` (ProseMirror JSON ↔ Markdown), `notionBlocks.ts` (ProseMirror → Notion blocks), `notionFileUpload.ts` (image upload to Notion), `notesAssets.ts` (local image store + `ticktask-asset://` protocol), `localExport.ts` (task → Markdown file with YAML frontmatter + copied assets).
- **src/preload/index.ts** — exposes a single `api` object on `window.api` via `contextBridge` (and `@electron-toolkit/preload`'s `electron`). Every method is a thin `ipcRenderer.invoke('domain:action', …)` wrapper. `index.d.ts` types `window.api` for the renderer.
- **src/renderer/src/** — React 19 app. `main.tsx` → `App.tsx` (uses **`HashRouter`** — required because Electron loads the renderer over `file://`). Pages in `pages/`, reusable components in `components/` (shadcn/Radix primitives under `components/ui/`), data-fetching logic in `hooks/` (one hook per domain: `useTasks`, `useProjects`, `useContexts`, `useTags`, `useCalendar`, `useHorizons`, `useWeeklyReview`, `useTaskDetail`, `useTimer`, `useNotification`, plus the UI-only `useIncrementalList` — IntersectionObserver paging of an already-loaded array — and `usePersistedState` for view preferences), Zustand `stores/timerStore.ts` for the live timer.
- **src/shared/types.ts** — the single source of truth for domain types (`Task`, `Project`, `Context`, `Area`, `Goal`, `TimeBlock`, `WeeklyReview`, the `Create*/Update*Input` variants, and the status/category/energy unions). Imported by all three contexts.

### IPC conventions

- Channels are named `domain:action` — e.g. `task:create`, `project:getTasks`, `schedule:getWeekly`, `notion:syncAllTasks`, `timeBlock:getForMonth`, `stats:gtdMetrics`. Adding a backend capability almost always means adding a matching channel in all three places.
- Renderer→main is request/response via `invoke`/`handle`. Main→renderer pushes are **events** sent with `webContents.send`: `tasks:refresh`, `float:update`, `float:clear`, `timer:stopped`, `task:unblocked`, and `notion:syncStart`/`syncSuccess`/`syncError`. The renderer subscribes via `window.api.on*` listeners (e.g. `SyncNotification`, the float timer). `lib/syncEvents.ts` helps bridge these.
- Task mutation handlers in `index.ts` call `autoSyncToNotion(...)` after the DB write when Notion auto-sync is enabled — keep that side effect in mind when touching task handlers.

### Adding a feature (the cross-cutting path)

A typical new capability touches, in order: `src/shared/types.ts` → a query fn in `src/main/database.ts` → an `ipcMain.handle('domain:action', …)` in `src/main/index.ts` (inside `setupIpcHandlers`) → a wrapper in `src/preload/index.ts` **and** its type in `index.d.ts` → a hook in `src/renderer/src/hooks/` → page/component + (if a new screen) a `<Route>` in `App.tsx`.

## Database

- File: `app.getPath('userData')/ticktask.db`. Opened with `journal_mode = WAL` and `foreign_keys = ON`. `initDatabase()` runs at startup.
- 13 tables: `tasks`, `time_entries`, `tags`, `task_tags`, `projects`, `contexts`, `task_contexts`, `weekly_reviews`, `task_dependencies`, `areas`, `goals`, `time_blocks`, `note_assets`.
- **Migrations are imperative, inline in `initDatabase()`** — `CREATE TABLE IF NOT EXISTS` plus guarded `ALTER TABLE`s. Changing a `CHECK` constraint requires the create-new-table-and-copy dance (see the `tasks_new` rebuild around `src/main/database.ts:265`, used to widen the task `status` CHECK). There is no migration framework — follow the existing pattern.
- All queries use better-sqlite3 prepared statements; multi-step writes use `db.transaction(...)`.

### Task listings

- `listTasks(filters: TaskListFilters)` is the single listing entry point. **Filtering and sorting
  belong in SQL, never in the renderer** — the `WHERE` is assembled by `buildTaskListQuery` in
  `src/main/taskQuery.ts` (pure, unit-tested), which also accepts `limit`/`offset`.
- Listings project through `TASK_LIST_COLUMNS`, which **omits `notes`** (the Tiptap JSON) and
  truncates `description`. Anything needing the full body uses `getTask`, or `listTasksForSync` —
  the Notion sync serializes both fields whole.
- Never enrich rows one by one: `enrichTasks(rows)` resolves tags, contexts, subtask counts and
  `is_blocked` with four aggregate queries per batch.
- Screens that need a slice ask for that slice: `task:listRunning` (timer store),
  `task:listActiveLight` (task pickers), `schedule:getForDate` (today's tasks). Pulling the whole
  list to `Array.filter` it in the renderer is the pattern this replaced.

## Rich notes (Tiptap)

Each task carries a `notes` column holding **ProseMirror JSON** (migrated away from an earlier
Editor.js format). The editor lives in `src/renderer/src/components/editor/`: `TaskNotesEditor.tsx`
mounts Tiptap with the extension set in `extensions.ts` (starter kit, tables, highlight, images,
file handler, drag handle, mention), plus a slash menu (`slash/`), `@` mentions of other tasks
(`mention/`, backed by `notes:searchMentions`), a bubble toolbar, and `NotesFocusBar` for the
zen/maximized modes. `notesFormat.ts` and `notesLayout.ts` hold the pure bits and are unit-tested.

The JSON is converted, never stored twice: `notesMarkdown.ts` for Markdown (local export),
`notionBlocks.ts` for Notion blocks. Pasted/dropped images go through `notesAssets.ts` — bytes land
in `userData/notes-assets`, a row in `note_assets`, and the document references them by the
privileged `ticktask-asset://` scheme registered in `index.ts` (`registerSchemesAsPrivileged` at
module scope, `registerAssetProtocol()` after `app.whenReady`). Pushing the same note to Notion
re-uploads those bytes via `notionFileUpload.ts`; `@notionhq/client` is pinned to v4 because the
upload API differs across majors.

## Desenho por task (Excalidraw)

Cada task tem um desenho, na aba **Desenho** do mesmo painel das notas. O JSON do Excalidraw vive
na coluna `drawing` de `tasks`; o PNG derivado vai para `userData/drawings/<taskId>.png`, gravado
no mesmo IPC (`drawing:save`) que grava o JSON — MCP, Notion e export local leem esse PNG, então
as duas escritas não podem divergir. O editor (`components/editor/TaskDrawingEditor.tsx`) é
carregado com `React.lazy`: o pacote é grande e só a aba de desenho paga por ele.

As fontes do Excalidraw são servidas pelo protocolo `ticktask-asset://` (host `excalidraw`), não
por `file://` — o renderer roda em origem opaca em produção e o Chromium recusa carregar fontes
dali. A CSP em `src/renderer/index.html` precisa listar o esquema em `font-src` e `img-src`.

## Notion sync (src/main/notion.ts)

Config (API key, target page/database id, auto-sync flag) is persisted to `app.getPath('userData')/notion-config.json`, not the DB. On first sync the app provisions a "GTD APP" Notion database and maps local task fields to Notion properties (names are Portuguese: Nome, Status, etc.), translating the local status union to Notion status options. Sync progress is surfaced to the UI through the `notion:sync*` events above.

## MCP server

Lives in `src/main/mcp/`, embedded in the main process. It speaks MCP over HTTP on loopback
(`127.0.0.1`), authenticated with a Bearer token, toggled from Settings. Tools are thin adapters
reusing `database.ts` directly — task-write tools call `afterTaskWrite(id)`, non-task-specific
writes call `broadcastRefresh()`. Destructive or bulk operations go through the two-phase
confirmation guard in `confirmGuard.ts` (preview + `confirm_token`, then repeat the call). See
`docs/mcp-server.md` for the tool list and known limitations.

## Windows & shortcuts

`index.ts` manages three `BrowserWindow`s: `mainWindow`, an always-on-top `floatWindow` (the floating timer, route `/float`), and `quickCaptureWindow` (route `/quick-capture`). Global shortcut **`CommandOrControl+Shift+Space`** toggles quick capture. The float and quick-capture windows are `frame: false`; the main window keeps its OS frame with `autoHideMenuBar` and renders its own in-app `TitleBar` (the `window:minimize`/`maximize`/`close` channels).

The float is driven by `mainWindow` events, not by the renderer: `minimize` shows it **only when a
timer is running**, `restore` and `focus` hide it. A due-date notification sweep
(`startNotificationScheduler`) also runs hourly from the main process.

All three windows load the **same renderer bundle**, so anything that runs at module scope runs
three times. `stores/timerWindow.ts` (`shouldBootstrapTimerStore`) is the guard: the auxiliary
routes must not boot their own copy of the timer store, or each window fights over the float. Keep
new global side effects behind the same check.

## Path aliases

Defined in `electron.vite.config.ts` and the tsconfigs:

- `@shared/*` → `src/shared/*` (available in main, preload, and renderer)
- `@renderer/*` → `src/renderer/src/*` (renderer only)

## Conventions

- Pages: `*Page.tsx`; hooks: `useX.ts`; stores: `xStore.ts`. shadcn config in `components.json` (new-york style, lucide icons, `@renderer/components/ui`).
- No global app store beyond the timer — screen data is fetched on demand inside hooks via `window.api`; cross-screen freshness comes from the `tasks:refresh` event, not shared state.
- Visual language (slate palette, status colors, typography scale, flat/no-shadow aesthetic) is
  specified in `ui-ux/TickTask - Design System & Guia de Estilo.md`. Check it before inventing
  colors or spacing.
- Carried over from `.github/copilot-instructions.md`: change only what the task requires, keep the
  code simple over clever, and reserve inline comments for genuinely non-obvious constraints.

## Release

`.github/workflows/release.yml` fires on tags matching `v*`: builds on ubuntu + windows runners
(`npm ci` → `npm run build` → `npm run dist`) and publishes the `.AppImage`, `.deb`, `.exe` and
`.zip` artifacts to a GitHub Release. Bump `version` in `package.json` before tagging.

## Git Context

- A cada nova task, criar branch a partir de Production
- Realizar commits granulares ao longo do desenvolvimento
- Ao finalizar a task, realizar push da branch para o repositório remoto

### Subir branch para Development

- Atualizar Development com os itens de Production via rebase
- Abrir PR da branch de feature para Development
- Realizar o merge
- Criar tag de pre-release apontando para o commit mergeado em Development

### Promover para Production

- Criar branch de release a partir de Production
- Abrir PR da branch de feature para a branch de release | merge por Squash
- Abrir PR da branch de release para Production | merge
- Criar tag de Production apontando para o commit mergeado em Production
- Apagar a branch de feature e a branch de release
- Sincronizar Development com Production via rebase
- JAMAIS contaminar production com itens de development
- Itens vão para production apenas por release/pr

<!-- rtk-instructions v2 -->

# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:

```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)

```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)

```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)

```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)

```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)

```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)

```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)

```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)

```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)

```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands

```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category         | Commands                       | Typical Savings |
| ---------------- | ------------------------------ | --------------- |
| Tests            | vitest, playwright, cargo test | 90-99%          |
| Build            | next, tsc, lint, prettier      | 70-87%          |
| Git              | status, log, diff, add, commit | 59-80%          |
| GitHub           | gh pr, gh run, gh issue        | 26-87%          |
| Package Managers | pnpm, npm, npx                 | 70-90%          |
| Files            | ls, read, grep, find           | 60-75%          |
| Infrastructure   | docker, kubectl                | 85%             |
| Network          | curl, wget                     | 65-70%          |

Overall average: **60-90% token reduction** on common development operations.

<!-- /rtk-instructions -->
