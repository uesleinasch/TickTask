# Lista de tarefas — `/`

`src/renderer/src/pages/TaskListPage.tsx` (~1000 linhas)

A tela inicial e o centro de gravidade do app. É a única rota em que o `TitleBar` exibe navegação, e
a única com ações em massa. Concentra quatro modos de visualização diferentes sobre o mesmo conjunto
de dados.

## Função

Ver, filtrar e triar todas as tarefas não arquivadas. Na prática cumpre três papéis distintos:

1. **Processar o Inbox** (aba padrão) — decidir o que fazer com o que foi capturado.
2. **Escolher o que executar agora** — filtrar por contexto, energia, projeto.
3. **Manutenção em lote** — mover dezenas de tarefas de status ou projeto de uma vez.

## Anatomia

```
┌────────────────────────────────────────────────────────────────────────┐
│ ① ABAS DE STATUS (7 pílulas, rolagem horizontal)   ② CONTROLES         │
│ [Todas][Inbox][Aguardando][Próximas]…      [Filtros ③][▦ ▤][Agrupar]  │
├────────────────────────────────────────────────────────────────────────┤
│ ③ PAINEL DE FILTROS (recolhível)                                       │
│ [Buscar…] [Categoria▾] [Contexto▾] [Projeto▾] [Tag▾] [Bloqueadas]     │
│ [Prazo] [Limpar filtros]           Mostrando N de M tarefas            │
├────────────────────────────────────────────────────────────────────────┤
│ ④ BARRA DE AÇÕES EM MASSA                                              │
│ N selecionada(s) · Selecionar todas visíveis · Limpar seleção          │
│                    [Marcar como▾][Marcar] [Projeto▾][Mover] [Excluir]  │
├────────────────────────────────────────────────────────────────────────┤
│ ⑤ CONTEÚDO — Tabela | Cards | Grupos | Kanban                          │
│                                                                        │
│    ⑥ sentinela "Carregando mais N tarefas…"                            │
└────────────────────────────────────────────────────────────────────────┘
```

---

## ① Abas de status

Sete pílulas em `flex overflow-x-auto gap-2 scrollbar-hide`, cada uma com ícone `lucide` de 14px.

| Aba | Ícone | Filtro aplicado |
| --- | --- | --- |
| Todas | `ListTodo` | `status: 'all'` |
| Inbox | `Inbox` | `status: 'inbox'` |
| Aguardando | `Hourglass` | `status: 'aguardando'` |
| Próximas | `Calendar` | `status: 'proximas'` |
| Executando | `Activity` | `status: 'executando'` |
| Finalizadas | `CheckSquare` | `status: 'finalizada'` |
| Someday | `Lightbulb` | `status: 'someday'` |

A aba ativa é persistida em `ticktask:taskListStatusFilter` (padrão: **Inbox**). Não há contador de
itens em nenhuma aba — informação que existe em `/projects` mas não aqui.

## ② Controles de visualização

Três grupos à direita das abas.

### Botão "Filtros"

Alterna o painel ③. Fica escuro (`bg-slate-900 text-white`) quando o painel está aberto **ou** quando
há filtro ativo. Exibe um badge circular branco com a **contagem de filtros ativos** — soma de:
categoria ≠ todas, busca preenchida, tag, contexto, projeto, "bloqueadas" e ordenação por prazo.

### Alternador Cards / Tabela

Dois botões-ícone (`LayoutGrid` / `List`) num contêiner `bg-white border rounded-lg p-1`. Persistido
em `ticktask:taskListViewMode`; o padrão é **tabela**.

### Agrupar / Kanban

No mesmo contêiner:

- **Agrupar** (`Layers`) — liga o agrupamento; desliga o Kanban.
- **Kanban** (`Columns3`) — **só aparece na aba Executando**; liga o Kanban e desliga o agrupamento.
- Quando um dos dois está ligado, surge um sub-alternador à direita de uma barra divisória:
  **Projeto** | **Contexto** (`ticktask:taskListGroupBy`).

Os dois modos são mutuamente exclusivos por código, mas cada um tem sua própria chave em
`localStorage`, o que permite estados de reabertura contraintuitivos.

## ③ Painel de filtros

Recolhível, com animação `slide-in-from-top-2 fade-in duration-200`. Dentro de um cartão branco, os
campos ficam em `flex flex-wrap items-end gap-4`. Cada um tem rótulo em
`text-xs font-semibold uppercase tracking-wider text-slate-600`.

| Campo | Rótulo | Controle | Comportamento |
| --- | --- | --- | --- |
| Busca | Buscar | `Input` com ícone `Search` à esquerda e "×" à direita quando preenchido | Busca em nome **e** descrição; sem debounce — dispara consulta a cada tecla |
| Categoria | Categoria | `SearchableSelect` com bolinha de cor | Todas / Urgente / Prioridade / Normal / Time Leak |
| Contexto | Contexto | `SearchableSelect` (`ícone nome`) | Só renderiza se existir ao menos um contexto |
| Projeto | Projeto | `SearchableSelect` | Inclui a opção **"Sem projeto"** (mapeada internamente para `-1` → `'none'`) |
| Tag | **Fonte / Tag** | `SearchableSelect` com bolinha de cor | Só renderiza se existir ao menos uma tag |
| Bloqueadas | Situação | Botão-toggle com `Lock` | Ativo: `bg-orange-100 text-orange-700` |
| Ordenação | Ordenar por | Botão-toggle com `CalendarDays` | Alterna `updated` ⇄ `due_date`; rótulo vira "Prazo ↑" quando ativo |
| Limpar | — | Link vermelho com "×" | Só aparece com filtro ativo; **não limpa a aba de status** |

Rodapé do painel (só com filtro ativo): `Mostrando {tasks.length} de {totalTasks} tarefas`, onde
`totalTasks` é a contagem de todas as tarefas não arquivadas.

> **Nota de design:** o rótulo do filtro de tag é "Fonte / Tag" aqui, mas a tela dedicada se chama
> apenas "Tags" e o campo no diálogo de criação também diz "Fontes / Tags". Três nomes para uma
> coisa.

## ④ Barra de ações em massa

Renderizada **sempre que houver ao menos uma tarefa carregada** — inclusive com nenhuma tarefa
selecionada, quando mostra "0 selecionada(s)" e botões desabilitados.

Cartão branco em duas metades (`flex-col xl:flex-row`):

**Esquerda:**
- `{N} selecionada(s)` em `font-semibold`
- "Selecionar todas visíveis ({total})" — desabilitado quando já estão todas
- "Limpar seleção" — desabilitado com zero selecionadas

**Direita:**
- `SearchableSelect` "Marcar como…" (os 6 status) + botão **Marcar** (`CheckCheck`)
- `SearchableSelect` "Mover para projeto…" (inclui "Sem projeto") + botão **Mover** (`FolderInput`)
- Botão **Excluir** (`Trash2`) em `bg-red-50 border-red-200 text-red-700`

Cada ação abre um `AlertDialog` cujo texto é montado dinamicamente:

| Ação | Título | Descrição |
| --- | --- | --- |
| Excluir | `Deletar N tarefa(s)?` | Avisa que a exclusão também ocorre no Notion se a sincronização automática estiver ativa |
| Marcar | `Marcar N tarefa(s)?` | Cita o status de destino |
| Mover | `Mover N tarefa(s)?` | Texto diferente para "sem projeto" e para um projeto escolhido |

Durante a execução, o botão de confirmação vira `Loader2` girando + "Aplicando…". Ao terminar, a
seleção é limpa e a lista recarregada. A seleção também é podada automaticamente quando os filtros
mudam: IDs que saíram do resultado deixam de estar selecionados.

## ⑤ Conteúdo

A ordem de decisão do que renderizar é:

1. Carregando → "Carregando…"
2. Zero tarefas → estado vazio (ícone `ListTodo` num círculo cinza + frase que muda conforme a aba)
3. Aba Executando **e** Kanban ligado → `TaskKanban`
4. Agrupamento ligado → `TaskGroups`
5. Modo cards → `TaskList`
6. Caso contrário → `TaskTable`

### Modo tabela (`TaskTable`) — padrão

Tabela dentro de `bg-white border rounded-sm overflow-hidden`. Cabeçalho `bg-slate-50` com rótulos
em `text-xs font-semibold uppercase tracking-wider`.

| Coluna | Largura | Conteúdo |
| --- | --- | --- |
| ☐ | `w-12` | Checkbox "selecionar todas visíveis", com estado indeterminado quando a seleção é parcial |
| **Tarefa** | flexível (`max-w-0`) | Ver detalhamento abaixo |
| **Status** | `w-28` | `StatusBadge` |
| **Categoria** | `w-28` | `CategoryBadge` (sempre, inclusive "Normal") |
| **Projeto** | `w-32` | Bolinha da cor + nome truncado em 100px, ou "—" |
| **Tags** | `w-32` | Até 2 pílulas coloridas + "+N", ou "—" |
| **Tempo** | `w-32`, direita | `formatTime` em `font-mono tabular-nums` + `Activity` pulsando se rodando |
| **Limite** | `w-24`, direita | `AlertCircle` + tempo, ou "—" |

A célula **Tarefa** empilha, da esquerda para a direita:
- caixa de 28px com o botão de expandir subtarefas (`ChevronRight`/`ChevronDown`) — vazia quando não
  há subtarefas, preservando o alinhamento;
- caixa de 16px com o indicador de estado: `Lock` laranja se bloqueada, senão um ponto pulsante
  (esmeralda, ou amarelo se time leak) se rodando, senão nada;
- nome da tarefa (`font-medium truncate`, `font-semibold` quando rodando);
- `DueDateBadge`, se houver prazo;
- botão **Hoje** (`CalendarDays`) — azul sólido com "Hoje ✓" se já agendada para hoje, contorno cinza
  caso contrário;
- contador `ListChecks {feitas}/{total}` de subtarefas;
- descrição em `text-xs text-slate-400 truncate max-w-md`, na segunda linha.

**Linhas de subtarefa** (ao expandir) aparecem como linhas irmãs com `bg-slate-50/70`, recuo
`pl-16`, um traço vertical, ícone de checkbox/círculo, nome (riscado se finalizada), `StatusBadge` e
tempo. Clicar navega para a subtarefa. As subtarefas são carregadas sob demanda
(`window.api.listSubtasks`) e memorizadas por sessão.

**Coloração Time Leak da linha:** `bg-red-50` acima de 60min, `bg-orange-50` acima de 30min,
`bg-yellow-50` acima de 0. Acima de 1h o tempo fica `text-red-600 font-bold`. A linha selecionada
sobrescreve tudo com `!bg-sky-50`.

### Modo cards (`TaskList` → `TaskCard`)

Grade responsiva `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`. Cada card
(`rounded-sm border border-slate-200 p-4`, altura total da célula) tem, de cima para baixo:

1. **Barra de acento lateral** — 4px na borda esquerda, sobreposta (não altera a borda). Esmeralda
   `#10b981` se rodando; a cor do nível de time leak se aplicável; senão `#cbd5e1` visível só no
   hover.
2. **Topo:** cadeado laranja (se bloqueada) + título em `font-semibold text-[15px] line-clamp-2`;
   checkbox à direita, oculto até o hover ou até estar marcado.
3. **Identidade:** bolinha + nome do projeto (truncado em 150px), `StatusBadge`, e `CategoryBadge`
   **só quando a categoria não é "normal"** — diferente da tabela, que sempre mostra.
4. **Descrição** em `line-clamp-2`, se houver.
5. **Chips:** `DueDateBadge`, limite de tempo (`Clock`), botão de subtarefas
   (`{feitas}/{total}` com chevron) que expande a lista inline.
6. **Subtarefas expandidas:** lista recuada com borda esquerda, ícone de estado e nome riscado
   quando finalizada.
7. **Tags e contextos:** pílulas coloridas (tags) e pílulas com contorno + emoji (contextos).
8. **Rodapé** (`mt-auto`, borda superior, `min-h-[2.75rem]`): cronômetro em `text-lg font-mono`
   (esmeralda se rodando, vermelho pulsante acima de 1h em time leak, "—" se zerado) e botão
   **Hoje**, revelado no hover.

Hover do card: `hover:border-slate-300 hover:-translate-y-0.5`.

### Modo agrupado (`TaskGroups`)

Envolve cards ou tabela — respeita o alternador de visualização. Cada grupo é um cartão com
cabeçalho clicável que recolhe/expande:

```
[▾] [● cor | 🏠 emoji] Nome do grupo   (N)
```

Ordenação dos grupos: alfabética `pt-BR`, com "Sem projeto" / "Sem contexto" sempre por último.

**Agrupar por contexto duplica tarefas:** uma tarefa com três contextos aparece nos três grupos. O
contador de cada grupo é local, então a soma dos contadores pode exceder o total real.

### Modo Kanban (`TaskKanban`)

Só na aba Executando. Colunas horizontais de `300px` (`overflow-x-auto`) com cabeçalho tingido pela
cor do grupo (`{cor}18` de fundo, `{cor}40` de borda), emoji ou bolinha, nome e contador. O corpo
empilha `TaskCard` completos com `gap-3`.

**Não há drag-and-drop no Kanban** — as colunas são projeto/contexto, não status, e servem apenas
como leitura agrupada.

## ⑥ Carregamento incremental

A consulta traz todas as tarefas do filtro, mas o DOM recebe **60 por vez**. Uma sentinela no fim da
lista ("Carregando mais N tarefas…" em `text-xs text-slate-400`) é observada por um
`IntersectionObserver` com `rootMargin: 400px`; ao se aproximar, mais 60 entram.

A paginação é **desligada nos modos agrupado e Kanban** — esses renderizam a lista inteira de uma
vez.

## Diálogo "Nova Tarefa" (`TaskDialog`)

Aberto pelo botão do `TitleBar`. `max-h-[90vh] overflow-y-auto`. Campos, na ordem:

| Campo | Controle | Obrigatório |
| --- | --- | --- |
| Nome | `Input`, placeholder "Ex: Refatorar módulo de login" | sim |
| Descrição | `Textarea` 3 linhas, sem redimensionar | não |
| Categoria \| Tempo Limite | duas colunas: `CategorySelect` \| `Input` mono `00:00:00` | não |
| Programar para \| Prazo | duas colunas de `input[type=date]` | não |
| Recorrência | `RecurrenceSelect` (Não repete / Diariamente / Semanalmente / Mensalmente) | não |
| Projeto | `SearchableSelect` — só projetos `active` ou `someday` | não |
| Contextos | pílulas alternáveis, coloridas quando selecionadas | não |
| Nível de Energia | três botões de largura igual com emoji; clicar no ativo desmarca | não |
| Fontes / Tags | `TagInput` + dica "Ex: E-mail, Trabalho, Pessoal, Cliente X" | não |

O campo de tempo limite aceita `HH:MM:SS`, `MM:SS` ou um número solto (interpretado como minutos).
Rodapé: "Cancelar" (ghost) e "Criar Tarefa" (primária, desabilitada com nome vazio, vira "Criando…").

**Ao criar, o app navega direto para `/task/{id}`** — o diálogo não deixa o usuário no lugar.

## Comportamentos que valem preservar

- **Botão "Hoje" onipresente** — agendar/desagendar para hoje sem sair da lista, em card e tabela.
  Alterna: se já está agendada para hoje, o clique remove.
- **Expandir subtarefas na própria linha** — sem navegar, com carregamento sob demanda.
- **Time Leak visualmente agressivo** — é a única semântica do app que colore o fundo inteiro da
  linha/card.
- **Recarga por evento** — a tela escuta `tasks:refresh` e se atualiza quando algo é criado pela
  captura rápida ou pelo servidor MCP.
