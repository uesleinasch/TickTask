# Detalhe da tarefa — `/task/:id`

`src/renderer/src/pages/SingleTaskPage.tsx` (~1100 linhas) — a maior e mais densa tela do app.

## Função

Três coisas ao mesmo tempo:

1. **Editar todos os metadados** da tarefa (painel esquerdo).
2. **Cronometrar** o trabalho (coluna central).
3. **Escrever e desenhar** sobre a tarefa (painel direito).

O ponto mais interessante do desenho atual é que essas três funções não são abas: são colunas
simultâneas, e o usuário redistribui a largura entre elas.

## Os três modos de layout

O estado `viewMode` (`NotesViewMode`) governa a tela inteira.

### `normal` — três colunas

```
┌──────────────────┬──────────────────────────┬─────────────────────┐
│ ASIDE 480px      │ CENTRO (flex-1)          │ NOTAS (redimen.)    │
│ (fixo, rolável)  │                          │ padrão 550px        │
│                  │            [Notas ⌃]     │ ┌─────────────────┐ │
│ ▔▔▔ acento 3px   │                          │ │Notas  Desenho   │ │
│ ← Voltar  [Cat▾] │        00:12:45          │ │  [ações][◎][⛶] │ │
│                  │      em andamento        │ ├─────────────────┤ │
│ Nome da tarefa   │  ▓▓▓▓▓▓░░░░ limite       │ │                 │ │
│ descrição…       │                          │ │  editor Tiptap  │ │
│                  │  [ ▶ Iniciar ] [ ↺ ]     │ │                 │ │
│ ── ORGANIZAÇÃO   │                          │ │                 │ │
│ Status  [▾]      │  ┌────────┬────────┐     │ │                 │ │
│ Projeto [▾]      │  │ Total  │Sessões │     │ │                 │ │
│ Contextos ●●●    │  └────────┴────────┘     │ │                 │ │
│ Tags    [+]      │                          │ │                 │ │
│                  │  + Adicionar tempo       │ │                 │ │
│ ── AGENDA        │  ✎ Ajustar total         │ │                 │ │
│ ── SUBTAREFAS    │  ⚠ Limite de tempo       │ │                 │ │
│ ── DEPENDE DE    │                          │ │                 │ │
│ ── HISTÓRICO     │                          │ │                 │ │
│ [Arquivar][Del]  │                          │ └─────────────────┘ │
└──────────────────┴──────────────────────────┴─────────────────────┘
                                              ↑ alça de arraste 6px
```

### `maximized` — o editor toma a tela

Aside e centro somem. No topo aparece a `NotesFocusBar` (48px), que devolve o essencial: voltar,
nome da tarefa, cronômetro, iniciar/pausar, ações de nota, zen e restaurar. Sair com **Esc**.

### `zen` — coluna de leitura

Só o editor, centralizado numa coluna de `zenWidth` (padrão 640px, ou a largura que a coluna central
tinha ao entrar no modo), com `pt-6 pb-20`. Um botão circular escuro flutua em `bottom-20 right-8`
para restaurar. Sair com **Esc**.

> **Detalhe importante:** no modo zen a limitação de largura só se aplica à aba **Notas**. A aba
> **Desenho** ocupa a tela inteira — o Excalidraw quer o oposto de uma coluna de leitura.

O `Esc` é ignorado enquanto houver um popup de sugestão aberto (`[data-suggestion-popup]`), para não
fechar o modo quando o usuário só queria fechar o menu de barra ou de menção.

---

## Painel esquerdo — dados da tarefa

`<aside class="w-[480px] shrink-0 overflow-y-auto bg-white border-r">`. Largura fixa: não
redimensiona.

### Faixa de acento

`h-[3px]` no topo, colorida pela **categoria** da tarefa:

| Categoria | Acento | Botão Iniciar | Glow do cronômetro |
| --- | --- | --- | --- |
| urgente | `#ef4444` | `#dc2626` | `rgba(239,68,68,.25)` |
| prioridade | `#f59e0b` | `#d97706` | `rgba(245,158,11,.25)` |
| normal | `#3b82f6` | `#2563eb` | `rgba(59,130,246,.25)` |
| time_leak | `#a855f7` | `#9333ea` | `rgba(168,85,247,.25)` |

Essa paleta **diverge** da usada nos badges de categoria (onde time leak é amarelo, não roxo).

### Cabeçalho

`← Voltar` (usa `navigate(-1)`, não uma rota fixa) e, à direita, o `CategorySelect` reduzido a 90%
(`scale-90 origin-right`).

### Identidade

- **Nome** — `input` sem moldura, `text-lg font-bold`, com borda inferior que aparece no hover e
  escurece no foco. Salva no `blur`.
- **Descrição** — `textarea` de 2 linhas, transparente, `text-sm text-slate-500`. Salva no `blur`.

Ambos são "campos invisíveis" — o usuário só descobre que são editáveis ao passar o mouse.

### Seções

Cada uma abre com um `SectionHeader`: ícone 14px cinza + rótulo em
`text-xs font-semibold uppercase tracking-widest text-slate-400` + linha divisória que preenche o
resto da largura.

#### ── ORGANIZAÇÃO (`FolderKanban`)

Grade `[90px_1fr]` — rótulo cinza à esquerda, controle à direita.

| Rótulo | Controle | Salvamento |
| --- | --- | --- |
| Status | `StatusSelect` (180px, `bg-slate-100`) | imediato + toast "Status alterado" |
| Projeto | `SearchableSelect` + link **"Abrir projeto →"** abaixo quando há projeto | imediato + toast |
| Contextos | pílulas alternáveis (emoji + nome), coloridas pela cor do contexto quando ativas | imediato |
| Tags | `TagInput` | imediato |

A lista de projetos do select inclui os `active`, os `someday` **e** o projeto atual, mesmo que
concluído ou arquivado — assim uma tarefa vinculada a projeto arquivado não perde o vínculo ao ser
editada.

#### ── AGENDA (`CalendarDays`)

- **Programado para** e **Prazo** — dois `input[type=date]` de 32px lado a lado, `bg-slate-50`.
- **Recorrência** — `RecurrenceSelect`.
- **Nível de energia** — três botões de largura igual (`flex-1 h-8`) com emoji + rótulo. O ativo
  ganha fundo e borda coloridos (esmeralda / âmbar / slate). Clicar no ativo desmarca.

#### ── SUBTAREFAS (`ListChecks`)

Renderizada **apenas se a tarefa não for ela mesma uma subtarefa** (`!task.parent_task_id`) — não há
hierarquia de três níveis.

`SubtaskList` mostra:
- aviso laranja "Subtarefas bloqueadas — conclua as dependências da tarefa pai primeiro", quando a
  tarefa-pai está bloqueada;
- contador `{feitas}/{total} concluídas` + porcentagem + `Progress` de 6px;
- cada subtarefa: checkbox (desabilitado se a pai está bloqueada) + nome clicável que **navega para a
  subtarefa** (com sublinhado no hover);
- botão "Nova subtarefa" que vira campo inline (Enter confirma, Esc cancela) com botões Adicionar /
  Cancelar.

Marcar o checkbox alterna entre `finalizada` e `inbox` — não devolve ao status anterior.

#### ── DEPENDE DE (`Lock`)

`DependencySelector`:
- cada dependência é uma linha colorida — **verde** com "✓ concluída" se já finalizada, **laranja**
  caso contrário — com cadeado, nome e "×" para remover;
- botão "Adicionar dependência" abre um seletor embutido com campo de busca e até 10 resultados,
  mostrando o status cru (`inbox`, `proximas`…) à direita de cada opção.

> Esse seletor carrega **todas** as tarefas via `window.api.listTasks()` e filtra no cliente — é o
> único lugar do app que ainda faz isso.

#### ── HISTÓRICO DE SESSÕES (`Activity`)

Só aparece se houver sessões. `TimeEntryList` lista as sessões **encerradas** numa área rolável de
250px: data/hora de início à esquerda, `+ HH:MM:SS` em mono à direita.

### Ações finais

Dois botões de largura igual, presos ao fim do painel (`mt-auto`): **Arquivar** (contorno cinza) e
**Deletar** (contorno e texto vermelhos, abre `DeleteConfirmDialog`). Ambos navegam para `/` ao
concluir.

---

## Coluna central — o timer herói

`flex-1`, fundo `bg-slate-50`, conteúdo centralizado numa coluna de `max-w-sm`.

### Botão "Notas"

Canto superior direito. Alterna o painel direito. Ativo: `bg-slate-900 text-white`.

### Aviso de bloqueio

Se a tarefa está bloqueada: faixa laranja com cadeado e "Bloqueada por dependências".

### Cronômetro

O elemento visualmente dominante do app.

- `font-mono font-bold tabular-nums tracking-tighter`
- **`text-8xl`** abaixo de 1h, **`text-7xl`** a partir de 1h (para não estourar a coluna)
- Cor: `text-red-500` se atingiu o limite; `text-slate-900` se rodando; `text-slate-300` se parado
- Quando rodando, ganha `textShadow` duplo com o glow da categoria

Abaixo, uma faixa de 28px alterna entre:
- rodando: ponto esmeralda pulsante + "em andamento";
- parado: "pronto para iniciar" em `text-xs uppercase tracking-widest`.

### Barra de progresso do limite

Só quando há `time_limit_seconds`. Acima dela, `{porcentagem}%` à esquerda e
`limite HH:MM:SS` à direita. A barra de 8px muda de cor: verde `#22c55e` até 80%, âmbar `#f59e0b`
entre 80% e 100%, vermelho `#ef4444` a partir de 100%.

Ao cruzar o limite pela primeira vez, o app dispara notificação do sistema — uma única vez, até que o
timer seja resetado.

### Controles

- **Iniciar** — botão largo de 52px, cor da categoria, com sombra colorida e `active:scale-[0.98]`.
  Desabilitado (cinza `#94a3b8`) quando a tarefa está bloqueada.
- **Pausar** — substitui Iniciar quando rodando; contorno branco de 2px, sem cor de categoria.
- **Resetar** (`RotateCcw`) — botão quadrado ao lado, abre `AlertDialog` "Todo o tempo registrado
  será zerado".

### Estatísticas

Dois cartões lado a lado: **Tempo total** (o valor persistido, não o cronômetro ao vivo) e
**Sessões** (quantidade de registros).

### Ajustes de tempo

Três linhas, cada uma com rótulo pequeno + ícone, campo mono e botão:

| Rótulo | Ícone | Ação | Botão |
| --- | --- | --- | --- |
| Adicionar tempo | `Plus` | Soma o valor ao total (placeholder `01:30:00`) | "Adicionar", verde |
| Ajustar total | `Edit3` | Substitui o total (pré-preenchido com o valor atual) | "Definir", cinza |
| Limite de tempo | `AlertCircle` | Define/limpa o limite | "Salvar", cinza |

---

## Painel direito — notas e desenho

Só existe com `notesOpen`. Em modo normal é `shrink-0` com largura controlada; nos outros modos vira
`flex-1`.

### Redimensionamento

Alça invisível de 6px na borda esquerda (`cursor-col-resize`, escurece no hover). Durante o arraste a
página inteira ganha `select-none cursor-col-resize`. Regras (`notesLayout.ts`):

- mínimo **360px** para o painel;
- mínimo **700px** reservado para o resto da tela;
- padrão **550px**, persistido em `ticktask.notesWidth`;
- a gravação em `localStorage` só acontece ao **soltar** o mouse (gravar a cada `mousemove` travava o
  arraste);
- redimensionar a janela re-aplica o clamp.

### Cabeçalho do painel (só no modo normal)

- **Abas** à esquerda: **NOTAS** | **DESENHO**, como texto
  `text-xs font-semibold uppercase tracking-widest` — ativo em `text-slate-900`, inativo em
  `text-slate-400`. Sem sublinhado, sem cápsula: é o padrão de aba mais discreto do app.
- **Ações** à direita (só na aba Notas):
  - **Salvar local** (`Save`) — na primeira vez abre o seletor de arquivo e grava a nota como
    Markdown com frontmatter YAML + imagens copiadas; depois o botão exibe o nome do arquivo
    (truncado em 140px) e cada auto-save reexporta;
  - **Salvar e sincronizar** (`RefreshCw`, verde) — força o save e empurra a nota para o Notion;
    o ícone gira durante a operação.
- **Zen** (`Focus`) e **Maximizar** (`Maximize2`) — dois botões-ícone de 32px.

### Editor de notas (Tiptap / ProseMirror)

Conteúdo com `class="notes-editor-content p-5 min-h-[200px]"`. Auto-save com **debounce de 400ms**
(`window.api.updateTaskNotes`). Além disso, enquanto o painel está aberto, um intervalo de **60
segundos** sincroniza com o Notion se houver alterações pendentes e o Notion estiver configurado.

Recursos disponíveis:

| Recurso | Como se aciona | Detalhes |
| --- | --- | --- |
| **Barra flutuante** | selecionar texto | negrito, itálico, tachado, código, marca-texto, **tamanho da fonte** (12/14/16/18/24/32 + Padrão), link (via `window.prompt`) |
| **Menu de barra** | digitar `/` | Título 1/2/3, Lista, Lista numerada, Checklist, Citação, Código, Divisor, Tabela, Imagem — navegável por ↑↓ e Enter |
| **Menções** | digitar `@` | busca tarefas, projetos e contextos; cada item mostra o tipo à direita; vira um chip azul-índigo no texto |
| **Alça de arraste** | passar o mouse à esquerda de um bloco | `GripVertical` para reordenar blocos |
| **Menu de tabela** | botão direito | dentro de tabela: adicionar/excluir coluna e linha, mesclar, dividir, excluir tabela (vermelho); fora: "Inserir tabela" |
| **Imagens** | colar ou arrastar arquivo | gravadas em `userData/notes-assets`, referenciadas pelo esquema `ticktask-asset://` |
| **Placeholder** | documento vazio | "Escreva suas anotações... (digite / para comandos)" |

O menu de barra mostra no máximo 12 itens (a lista tem 11) e filtra pelo texto digitado.

### Editor de desenho (Excalidraw)

Carregado com `React.lazy` — o pacote é grande e só a aba de desenho paga por ele. Enquanto carrega,
um `Loader2` girando ocupa a área.

- Idioma `pt-BR`.
- Auto-save com **debounce de 800ms**.
- Salva o JSON da cena **e** um PNG derivado no mesmo IPC (`drawing:save`) — MCP, Notion e exportação
  local leem esse PNG, então as duas gravações não podem divergir.
- Do `appState` só o `viewBackgroundColor` é persistido; o resto é estado volátil.
- A biblioteca de formas prontas do Excalidraw é escondida por CSS (`.sidebar-trigger`) por não fazer
  parte do fluxo do app.

### Persistência do conteúdo entre aberturas

O editor grava direto pelo IPC, sem passar pelo hook de detalhe da tarefa. Para que fechar e reabrir
o painel não restaure um conteúdo velho, a página guarda o último JSON salvo em estado local
(`savedNotes` / `savedDrawing`) e o usa na remontagem. Trocar de tarefa limpa esses caches e volta
para a aba **Notas**.

## Estados especiais

| Situação | O que aparece |
| --- | --- |
| Carregando | "carregando..." em `font-mono text-sm text-slate-400`, centralizado |
| Tarefa inexistente | "Tarefa não encontrada" + botão "Voltar" |
| Tarefa bloqueada | Faixa laranja no centro + botão Iniciar cinza e desabilitado |
| Limite atingido | Cronômetro vermelho + barra vermelha + notificação do sistema (uma vez) |

## Nota de arquitetura visível na UI

A página usa `h-full`, nunca `h-screen`. Com `100vh` sobrariam 56px além do `<main>`, e um
`scrollIntoView` (o Excalidraw dá foco ao canvas ao selecionar um elemento) rolaria esse excedente,
escondendo a barra do modo foco atrás do TitleBar sem volta. Qualquer redesenho da casca precisa
manter essa contenção de altura.
