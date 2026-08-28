# Projetos — `/projects` e `/project/:id`

`src/renderer/src/pages/ProjectsPage.tsx` · `src/renderer/src/pages/ProjectDetailPage.tsx`

No GTD, projeto é qualquer resultado que exige mais de uma ação. No TickTask ele agrupa tarefas,
carrega um *outcome* (resultado desejado), uma cor que se propaga para todas as listagens e,
opcionalmente, uma área de foco.

---

# Lista de projetos — `/projects`

## Cabeçalho

Padrão de sub-página: `← Voltar` · divisor · `FolderKanban` · "Projetos" · botão **Novo Projeto**
(`bg-slate-900`).

## Abas de status

Cinco pílulas com **contador embutido** (`text-xs opacity-70`) — recurso que a lista de tarefas não
tem:

| Aba | Contador |
| --- | --- |
| Todos | sem contador |
| **Ativos** (padrão) | sim |
| Someday | sim |
| Concluídos | sim |
| Arquivados | sim |

## Cartão de projeto

Grade `grid-cols-1 md:grid-cols-2 gap-4`. Cada cartão é `bg-white border rounded-sm p-5` com
**borda esquerda de 4px na cor do projeto** e hover `shadow-md -translate-y-0.5`.

Conteúdo, de cima para baixo:

1. **Linha superior:** badge de status (pílula colorida com texto branco — `bg-emerald-500` ativo,
   `bg-teal-500` someday, `bg-purple-500` concluído, `bg-gray-500` arquivado) e, à direita, a data
   limite com ícone `Clock`, se houver.
2. **Título** — `font-semibold text-lg line-clamp-1`.
3. **Descrição** — `line-clamp-2`, se houver.
4. **Outcome** — bloco `bg-emerald-50` com ícone `Target` e o texto em `line-clamp-2`, se houver.
5. **Progresso** — `{feitas} / {total} tarefas` à esquerda, porcentagem à direita, barra de 6px
   esmeralda.
6. **Próxima ação** — bloco `bg-blue-50` com `ArrowRight` e `Próxima: {nome}`.
   Quando o projeto está **ativo, tem tarefas e não tem próxima ação**, no lugar aparece um alerta
   `bg-amber-50`: **"Sem próxima ação definida"**. É o único aviso de saúde GTD inline em toda a
   interface.

Clicar em qualquer parte do cartão abre `/project/:id`.

## Estado vazio

`FolderKanban` num círculo cinza, "Nenhum projeto encontrado." e um botão "Criar primeiro projeto"
que abre o diálogo.

## Diálogo "Novo Projeto"

Descrição do cabeçalho: *"Um projeto GTD requer mais de uma ação para ser concluído."*

| Campo | Controle |
| --- | --- |
| Nome * | `Input`, placeholder "Ex: Redesenhar módulo de autenticação" |
| Descrição | `Textarea` 2 linhas |
| Resultado Desejado (Outcome) | `Textarea` 2 linhas, placeholder "Como será quando este projeto estiver concluído?" |
| Cor | `ColorPicker` — 12 círculos de 32px; o selecionado ganha `ring-2 ring-offset-2` e `scale-110`. Padrão: `#6366f1` (índigo) |

O diálogo **não permite escolher status nem área** — ambos só existem no detalhe (status) ou não são
editáveis pela UI (área). Ao criar, navega direto para `/project/:id`.

---

# Detalhe do projeto — `/project/:id`

## Cabeçalho

- **Esquerda:** `← Projetos` (volta para a lista, não para `/`).
- **Direita:** `Select` de status de 160px (`bg-slate-100 border-none font-semibold`) com as quatro
  opções, e um botão vermelho quadrado só com `Trash2` que abre o `DeleteConfirmDialog`.

## Corpo (`max-w-3xl mx-auto`)

### Identidade

- Bolinha de 20px com a cor do projeto (`border border-black/10`) + **título editável inline** em
  `text-3xl font-bold` — campo transparente com borda inferior que aparece no hover.
- **Descrição** — `textarea` transparente que ganha `hover:bg-white/50` ao passar o mouse.
- **`ColorPicker`** logo abaixo, salvando a cada clique. Trocar a cor aqui repinta o projeto em
  todas as listagens e no Kanban.

Título, descrição, outcome e data limite salvam no **blur** (uma única chamada que envia os quatro).

### Dois cartões lado a lado

| Cartão | Conteúdo |
| --- | --- |
| **Resultado Desejado** (`Target` verde) | `textarea` `bg-slate-50` de altura mínima 80px |
| **Data Limite** (`Clock` azul) | `input[type=date]` e, abaixo, um bloco **Progresso** com `{feitas} / {total} tarefas`, porcentagem e barra de 8px |

O cartão da direita acumula duas coisas sem relação (prazo e progresso) porque o da esquerda ficou
com apenas um campo.

### Tarefas do projeto

Título de seção `Tarefas do Projeto (N)` em `text-sm font-bold uppercase tracking-wider
text-slate-400`.

Cada tarefa é uma linha clicável (`rounded-lg px-4 py-3`) com:
- `StatusBadge` + `CategoryBadge` na primeira linha;
- nome truncado na segunda;
- à direita, `Activity` pulsante se rodando e o tempo em `font-mono tabular-nums`.

**Não há como criar ou vincular tarefa a partir daqui.** O estado vazio diz exatamente isso:
*"Nenhuma tarefa vinculada a este projeto. Vincule tarefas editando-as e selecionando este projeto."*
É uma lacuna funcional relevante — o caminho natural (estar no projeto e adicionar uma ação) não
existe.

## O que não é editável pela interface

- **Área de foco** (`area_id`) — o campo existe no modelo e aparece como etiqueta nos cartões de
  `/horizons`, mas nenhuma tela permite atribuí-lo: só o servidor MCP
  (`manage_structure`) grava esse vínculo. Um projeto criado pela interface nunca terá área.
- **Próxima ação** — é derivada, não escolhida: é o nome da tarefa com status `proximas` de
  `updated_at` mais recente naquele projeto.
