# Biblioteca de componentes

Inventário de tudo que é reutilizável em `src/renderer/src/components/`. Dividido em três camadas:
**primitivos** (shadcn/Radix), **componentes de domínio** e **editor**.

---

## Primitivos — `components/ui/`

Gerados pelo shadcn/ui (estilo *new-york*, ícones lucide, configuração em `components.json`).
Consomem os tokens CSS (`--primary`, `--border`, `--radius`…) definidos em `assets/main.css`.

| Componente | Uso no app |
| --- | --- |
| `button` | 6 variantes (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) × 4 tamanhos (`default` h-9, `sm` h-8, `lg` h-10, `icon` 36px) |
| `input` · `textarea` | campos de formulário |
| `select` | seleção simples (Radix) — usado em status, categoria, recorrência, horizonte |
| `searchable-select` | **componente próprio**, não do shadcn — ver abaixo |
| `dialog` | diálogos de criação/edição |
| `alert-dialog` | confirmações destrutivas |
| `card` | **importado por nenhuma tela** — todas escrevem `bg-white border border-slate-200 rounded-sm` na mão |
| `badge` | **importado por nenhuma tela** — os badges do app são `StatusBadge` / `CategoryBadge`, escritos à parte |
| `progress` | só em `SubtaskList` e em H1 dos horizontes. As outras seis barras de progresso do app são `<div>` com `width` inline |
| `scroll-area` | área rolável das sub-páginas |
| `tabs` | **importado por nenhuma tela** — todas as abas são botões manuais |
| `sonner` | toasts, ancorados em `bottom-right` |

> Três primitivos (`card`, `badge`, `tabs`) existem no repositório e **não são usados por nenhuma
> tela**: cada uma reimplementou o mesmo desenho à mão. Padronizá-los é o ganho mais barato de uma
> refatoração.

### `SearchableSelect`

O select mais usado do app — filtros, seleção de projeto, tarefa, tag. Não é do shadcn.

- **Gatilho:** botão `h-9` com a opção selecionada (bolinha de cor opcional + rótulo truncado) e
  `ChevronDown` que rotaciona 180° quando aberto.
- **Dropdown:** campo de busca com ícone e "×" no topo, lista de até 200px rolável, item selecionado
  com `bg-slate-100 font-medium` e `Check` à direita.
- **Teclado:** `Esc` fecha; `Enter` seleciona quando resta exatamente **um** resultado. Não há
  navegação por ↑↓.
- Fecha ao clicar fora; foca a busca automaticamente ao abrir.
- Animação de entrada: `fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150`.

---

## Componentes de domínio

### Exibição de tarefa

| Componente | Onde aparece | Notas |
| --- | --- | --- |
| `TaskCard` | lista (modo cards), agrupado, Kanban | 8 regiões; acento lateral; expande subtarefas inline. Ver [01](01-lista-de-tarefas.md) |
| `TaskList` | wrapper do `TaskCard` | grade `1 / 2 / 3` colunas |
| `TaskTable` | lista (modo tabela), agrupado | 8 colunas; linhas de subtarefa; coloração time leak |
| `TaskGroups` | lista com agrupamento | cabeçalho recolhível + delega para `TaskList` ou `TaskTable` |
| `TaskKanban` | aba Executando com Kanban | colunas de 300px com cabeçalho tingido; sem drag-and-drop |
| `TaskDialog` | criação de tarefa | 9 campos; navega para a tarefa criada |

### Badges e seletores

| Componente | Saída |
| --- | --- |
| `StatusBadge` | pílula `rounded-full border px-2.5 py-0.5 text-xs font-semibold`; `animate-pulse` no status "executando" |
| `CategoryBadge` | pílula com ícone; dois tamanhos (`sm` de 10px, `md` de 12px) |
| `DueDateBadge` | pílula com `Calendar` cujo rótulo e cor derivam da distância até o prazo — ver tabela abaixo |
| `StatusSelect` | `Select` de 180px com os 6 status |
| `CategorySelect` | `Select` de 140px com ícone e cor por categoria no próprio gatilho |
| `RecurrenceSelect` | `Select` com 4 opções; serializa a regra em JSON |
| `ColorPicker` | 12 círculos de 32px a partir de `DEFAULT_COLORS`; selecionado com `ring-2 ring-offset-2 scale-110` |

#### Lógica do `DueDateBadge`

| Distância | Rótulo | Cor |
| --- | --- | --- |
| passado | "Atrasada" | vermelho |
| hoje | "Hoje" | vermelho |
| amanhã | "Amanhã" | amarelo |
| 2–3 dias | "2d" / "3d" | amarelo |
| 4+ dias | `dd/mm` | verde |

"Atrasada" e "Hoje" compartilham exatamente a mesma cor, o que impede distinguir urgência de atraso à
primeira vista.

### Entrada e relações

| Componente | Comportamento |
| --- | --- |
| `TagInput` | pílulas removíveis + campo livre. Enter cria ou seleciona; Backspace com campo vazio remove a última; ↑↓ navegam nas sugestões; Esc fecha. Sem sugestão, oferece **"Criar tag «x»"**. Cria a tag via `getOrCreateTag` |
| `SubtaskList` | progresso + checkboxes + adicionar inline. Respeita o bloqueio da tarefa-pai |
| `DependencySelector` | lista verde/laranja conforme a dependência esteja concluída + busca embutida (até 10 resultados) |
| `TimeEntryList` | sessões encerradas, `max-h-[250px]`, data à esquerda e `+ HH:MM:SS` à direita |
| `DeleteConfirmDialog` | `AlertDialog` com título e descrição padrão sobrescrevíveis |

### Cronômetro

| Componente | Onde |
| --- | --- |
| `FloatingTimer` | pílula preta fixa em `bottom-6 right-6`; uma por timer ativo; **só fora de sub-páginas**. Ícone com `animate-ping`, nome truncado, tempo em mono e `Maximize2`. Clicar navega para a tarefa |
| `RunningNowPanel` | painel esmeralda no dashboard; lista os timers com botão de parar individual e "Parar todos" |

Os dois mostram a mesma informação em dois desenhos completamente diferentes, e o `FloatTimerPage` é
um terceiro.

### Sistema

| Componente | Detalhe |
| --- | --- |
| `TitleBar` | logo + 11 botões de navegação, **só na rota `/`** |
| `SyncNotification` | banner fixo em `top-14 right-4`, três estados (sincronizando com `Cloud`+`Loader2`, sucesso verde, erro vermelho); some sozinho, com botão de fechar nos estados finais |
| `Versions` | **componente morto** — mostra versões de Electron/Chrome/Node; não é importado por ninguém |
| `Timer` | **componente morto** — cronômetro completo substituído pela implementação inline da `SingleTaskPage` |

---

## Editor — `components/editor/`

| Arquivo | Papel |
| --- | --- |
| `NotesPanel` | casca do painel direito: abas Notas/Desenho, ações, botões zen/maximizar; carrega o Excalidraw com `React.lazy` |
| `TaskNotesEditor` | monta o Tiptap; auto-save com debounce de 400ms; expõe `flushSave()` via ref |
| `extensions.ts` | conjunto de extensões: StarterKit, Highlight, TextStyle+FontSize, TaskList/TaskItem aninhável, Placeholder, TableKit redimensionável, SlashCommand, Mention, Image com `assetId`, FileHandler |
| `BubbleToolbar` | barra flutuante na seleção: negrito, itálico, tachado, código, marca-texto, tamanho da fonte (12–32px), link |
| `slash/SlashCommand` + `SlashMenu` | menu do `/` com 11 comandos; navegação por ↑↓ e Enter; máximo de 12 itens visíveis |
| `mention/mentionConfig` + `MentionList` | menções `@` a tarefas, projetos e contextos, com o tipo à direita de cada item |
| `TableContextMenu` | menu de botão direito: 10 operações de tabela dentro dela, "Inserir tabela" fora |
| `NotesActions` | botões "Salvar local" e "Salvar e sincronizar" |
| `NotesFocusBar` | barra de 48px do modo maximizado: voltar, nome, cronômetro, iniciar/pausar, ações, zen, restaurar |
| `TaskDrawingEditor` | Excalidraw em `pt-BR`; auto-save com debounce de 800ms; grava JSON + PNG derivado |
| `imageUpload` | seleção/colagem de imagem → `notesAssets` → `ticktask-asset://` |
| `suggestionPopup` | infraestrutura compartilhada dos popups de `/` e `@`; marca `[data-suggestion-popup]` para que o `Esc` da página não interfira |
| `notesFormat.ts` | ProseMirror ↔ formato legado do Editor.js (unitário) |
| `notesLayout.ts` | limites de largura do painel (unitário) |
| `drawingAssetPath.ts` | resolve as fontes do Excalidraw pelo esquema `ticktask-asset://` (host `excalidraw`) |

---

## Hooks de interface

| Hook | Função |
| --- | --- |
| `usePersistedState(chave, inicial)` | `useState` espelhado em `localStorage`; tolerante a falha de acesso |
| `useIncrementalList(itens, chaveDeReset, tamanho=60)` | renderização em lotes via `IntersectionObserver` com `rootMargin: 400px` |
| `useNotification()` | dispara notificação do sistema pelo IPC |

## Estado do cronômetro — `stores/timerStore.ts` (Zustand)

A única store global. Guarda um mapa `taskId → { task, entry, displaySeconds }`.

- **Timers paralelos por padrão** — iniciar um não para os outros.
- Um único `setInterval` de 1s recalcula todos os cronômetros a partir do horário de início gravado
  (não por acumulação), e empurra o estado para a janela flutuante.
- **Alerta de Time Leak:** para tarefas dessa categoria, acima de 1h dispara notificação do sistema a
  cada 5 minutos: *"A tarefa X já está em 1h23min. Considere finalizá-la!"*
- `syncWithDatabase()` reconstrói o estado a partir das tarefas com `is_running` — chamado no boot e
  ao entrar numa tarefa que está rodando.
- **Guarda de janela:** `shouldBootstrapTimerStore(hash)` impede que as janelas `/float` e
  `/quick-capture` iniciem sua própria cópia da store; sem isso, as três janelas disputariam o
  controle do float.

## Utilitários — `lib/`

| Função | Saída |
| --- | --- |
| `cn(...)` | `clsx` + `tailwind-merge` |
| `formatTime(segundos)` | `HH:MM:SS`, sempre com duas casas e nunca negativo |
| `parseTimeInput('01:30:00')` | segundos |
| `formatDate` / `formatDateTime` | `dd/mm` e `dd/mm, HH:MM` em `pt-BR` |
| `calculateProgress(atual, limite)` | 0–100 |
| `DEFAULT_COLORS` | as 12 cores do `ColorPicker` |
| `syncEvents` | ponte entre os eventos IPC do Notion e o `SyncNotification` |
