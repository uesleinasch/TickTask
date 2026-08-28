# Design tokens — o que o código realmente usa

Este documento descreve o sistema visual **como implementado**, não como especificado. O guia
original (`ui-ux/TickTask - Design System & Guia de Estilo.md`) descreve um app com `rounded-xl` e
sombras suaves; o código migrou para uma estética mais achatada e nunca atualizou o guia.

Fonte da verdade do código: `src/renderer/src/assets/main.css` (Tailwind v4, bloco `@theme inline`)
e `src/shared/types.ts`.

---

## 1. Variáveis de tema (`:root`)

| Token | Valor | Equivalente Tailwind |
| --- | --- | --- |
| `--background` | `#f8fafc` | slate-50 |
| `--foreground` | `#0f172a` | slate-900 |
| `--card` / `--popover` | `#ffffff` | white |
| `--primary` | `#0f172a` | slate-900 |
| `--primary-foreground` | `#ffffff` | white |
| `--secondary` / `--muted` / `--accent` | `#f1f5f9` | slate-100 |
| `--muted-foreground` | `#64748b` | slate-500 |
| `--destructive` | `#ef4444` | red-500 |
| `--border` / `--input` | `#e2e8f0` | slate-200 |
| `--ring` | `#0f172a` | slate-900 |
| `--radius` | `0.75rem` (12px) | — |

Gráficos: `--chart-1` `#10b981` · `--chart-2` `#3b82f6` · `--chart-3` `#f59e0b` ·
`--chart-4` `#8b5cf6` · `--chart-5` `#ef4444`. **Nenhum gráfico do dashboard usa esses tokens** —
todos definem paletas locais.

Um bloco `.dark` completo existe no CSS, mas **nada no app adiciona a classe `dark`**. Tema escuro
está definido e desligado.

---

## 2. Raios — a armadilha do `rounded-sm`

O `@theme inline` redefine a escala de raios a partir de `--radius: 12px`:

| Classe | Cálculo | **Valor real** | Valor padrão do Tailwind |
| --- | --- | --- | --- |
| `rounded-sm` | `radius − 4px` | **8px** | 2px |
| `rounded-md` | `radius − 2px` | **10px** | 6px |
| `rounded-lg` | `radius` | **12px** | 8px |
| `rounded-xl` | `radius + 4px` | **16px** | 12px |

Consequência: quando o código escreve `rounded-sm` em cartões, o resultado é **8px** — visualmente
próximo do `rounded-lg` padrão do Tailwind. O "design flat" da migração não é tão anguloso quanto o
nome das classes sugere.

### Frequência de uso

| Classe | Ocorrências | Onde |
| --- | --- | --- |
| `rounded-lg` | 83 | botões pequenos, chips, blocos internos, campos |
| `rounded-full` | 82 | pílulas de status, abas, bolinhas de cor, avatares |
| `rounded-sm` | 65 | cartões de superfície, cabeçalhos de seção, contêineres de página |
| `rounded-md` | 36 | primitivos do shadcn (botões, inputs, popovers) |
| `rounded-2xl` | 2 | apenas a janela de captura rápida |

Cinco raios diferentes em circulação, sem regra explícita de qual usar quando.

---

## 3. Tipografia

```css
font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans',
             'Helvetica Neue', sans-serif;
```

Definido no `body`. Não há `@font-face` nem importação de webfont: se **Inter** não estiver instalada
no sistema, o app cai na fonte de interface do SO.

### Aviso sobre a fonte monoespaçada

O `@theme inline` define:

```css
--font-sans: var(--font-geist-sans);
--font-mono: var(--font-geist-mono);
```

**`--font-geist-sans` e `--font-geist-mono` não são definidas em lugar nenhum do projeto.** Como as
utilidades `font-sans` e `font-mono` do Tailwind resolvem esses tokens, é provável que `font-mono`
não aplique nenhuma família monoespaçada e o texto herde a pilha do `body` (Inter). Isso afetaria
todo cronômetro, tempo de sessão e valor numérico do app — inclusive o display gigante da tela de
tarefa.

> Vale confirmar visualmente no app antes de agir. Se confirmado, é um dos ajustes de maior impacto
> visual pelo menor esforço: basta declarar uma pilha mono real.

O `tabular-nums` continua funcionando independentemente disso — os números não "pulam" a cada
segundo.

### Escala em uso

| Tamanho | Onde aparece |
| --- | --- |
| `text-8xl` | cronômetro abaixo de 1h (detalhe da tarefa) |
| `text-7xl` | cronômetro a partir de 1h |
| `text-3xl` | título do projeto (detalhe) |
| `text-xl` | "TickTask App" no TitleBar; título do Dashboard; títulos de diálogo |
| `text-lg` | títulos de sub-página; títulos de bloco no dashboard; números destacados |
| `text-2xl` | valores dos cartões de métrica |
| `text-sm` | corpo padrão |
| `text-xs` | rótulos, metadados, badges, dicas |
| `text-[10px]` | rótulos mínimos (emoji de contexto no card, dica da captura rápida) |
| `text-[15px]` | título do `TaskCard` — o único tamanho arbitrário do app |

Rótulo de seção recorrente:
`text-xs font-semibold uppercase tracking-wider text-slate-600` (filtros) ou
`text-xs font-semibold uppercase tracking-widest text-slate-400` (detalhe da tarefa) —
duas variantes do mesmo papel.

---

## 4. Sombras

O guia original prescrevia `shadow` em cartões e `shadow-md` no hover. A migração para "flat"
removeu o `shadow-sm` dos cartões, mas o resto ficou:

| Classe | Ocorrências | Onde |
| --- | --- | --- |
| `shadow-md` | 15 | abas ativas, hover de cartões, popovers |
| `shadow-lg` | 10 | dropdowns, menus de contexto, etiqueta de arraste |
| `shadow-2xl` | 7 | diálogos, timer flutuante, captura rápida |
| `shadow-xs` | 7 | primitivos do shadcn (`Button`) |
| `shadow-xl` | 1 | — |

Nenhum `shadow-sm`. O resultado é um sistema onde a superfície base é plana, mas quase todo elemento
elevado ainda usa sombra — e em cinco intensidades.

---

## 5. Paletas semânticas

### Status da tarefa

Existem **três definições** para as mesmas seis coisas:

| Status | `StatusBadge` (o que se vê) | `STATUS_COLORS` em `shared/types.ts` | `STATUS_COLORS` local do Dashboard |
| --- | --- | --- | --- |
| inbox | `bg-slate-100 text-slate-500 border-slate-200` | `bg-gray-500` | `#94a3b8` |
| aguardando | `bg-yellow-100 text-yellow-600 border-yellow-200` | `bg-yellow-500` | `#f59e0b` |
| proximas | `bg-blue-100 text-blue-600 border-blue-200` | `bg-blue-500` | `#3b82f6` |
| executando | `bg-emerald-100 text-emerald-600 border-emerald-200` + `animate-pulse` | `bg-green-500` | `#22c55e` |
| finalizada | `bg-purple-100 text-purple-600 border-purple-200` | `bg-purple-500` | `#10b981` ⚠️ |
| someday | `bg-teal-100 text-teal-600 border-teal-200` | `bg-teal-500` | `#14b8a6` |

- `STATUS_COLORS` de `shared/types.ts` **não é importado por nenhum arquivo** — é um export morto.
- No dashboard, `finalizada` é **esmeralda**, não roxo — a mesma família de `executando`.

### Categoria da tarefa

Quatro definições:

| Categoria | `CategoryBadge` | `CategorySelect` (gatilho) | Acento da tela de tarefa | Bloco do calendário | Gráfico do dashboard |
| --- | --- | --- | --- | --- | --- |
| urgente | `bg-red-100 text-red-700` | `text-red-600 bg-red-50` | `#ef4444` | `bg-red-400` | `#ef4444` |
| prioridade | `bg-orange-100 text-orange-700` | `text-orange-600 bg-orange-50` | `#f59e0b` ⚠️ | `bg-orange-400` | `#f59e0b` |
| normal | `bg-blue-100 text-blue-700` | `text-blue-600 bg-blue-50` | `#3b82f6` | `bg-blue-400` | `#3b82f6` |
| time_leak | `bg-yellow-100 text-yellow-700` | `text-yellow-600 bg-yellow-50` | **`#a855f7`** ⚠️ | `bg-yellow-400` | **`#a855f7`** ⚠️ |

**Time leak é amarelo em três lugares e roxo em dois.** Prioridade é laranja nos badges e âmbar no
acento.

Além disso, `CATEGORY_COLORS` de `shared/types.ts` também é um export morto — `CalendarPage` e
`DashboardPage` declararam cópias locais em vez de importá-lo.

### Status do projeto

Uma definição só, importada de `shared/types.ts` e usada em `ProjectsPage`:

| Status | Rótulo | Cor |
| --- | --- | --- |
| `active` | Ativo | `bg-emerald-500` |
| `someday` | Someday | `bg-teal-500` |
| `done` | Concluído | `bg-purple-500` |
| `archived` | Arquivado | `bg-gray-500` |

São pílulas de **cor sólida com texto branco**, diferentes das pílulas de status de tarefa (fundo
claro + texto escuro + borda). Duas gramáticas de badge no mesmo app.

### Nível de energia

Definição única e consistente (`ENERGY_COLORS` em `shared/types.ts`):
`alto` `#22c55e` ⚡ · `medio` `#f59e0b` 🔋 · `baixo` `#94a3b8` 😴.

### Escala Time Leak (fundo do card / da linha)

| Tempo acumulado | Fundo | Acento |
| --- | --- | --- |
| 0 | branco | `#fde047` |
| > 0 | `bg-yellow-50` | `#eab308` |
| ≥ 30 min | `bg-orange-50` | `#f97316` |
| ≥ 60 min | `bg-red-50` | `#ef4444` + tempo em vermelho pulsante |

### Escala do heatmap (dashboard)

`bg-slate-100` (0h) → `emerald-200` (<1h) → `300` (<2h) → `400` (<4h) → `500` (<6h) → `600` (≥6h).

### Paleta de cores livres (`DEFAULT_COLORS`)

Doze cores, usadas pelo `ColorPicker` (projetos, tags) e duplicadas literalmente como
`CONTEXT_COLORS` em `ContextsPage`:

`#3b82f6` `#8b5cf6` `#ec4899` `#f43f5e` `#f97316` `#eab308`
`#22c55e` `#14b8a6` `#0ea5e9` `#6366f1` `#ef4444` `#84cc16`

Padrão para projeto e tag: `#6366f1` (índigo, índice 9). Padrão para contexto: `#3b82f6` (azul,
índice 0).

### Paleta de gráficos (`CHART_COLORS` do dashboard)

Dez cores rotativas, sem relação com qualquer semântica do app:
`#3b82f6` `#22c55e` `#f59e0b` `#ef4444` `#8b5cf6` `#ec4899` `#14b8a6` `#f97316` `#6366f1` `#84cc16`

---

## 6. Animações

| Classe | Ocorrências | Uso |
| --- | --- | --- |
| `animate-spin` | 12 | `Loader2` durante operações |
| `animate-pulse` | 10 | badge "Executando", pontos de timer ativo, cronômetro em time leak crítico |
| `animate-in` / `animate-out` | 13 | entrada de diálogos, dropdowns, painel de filtros |
| `animate-ping` | 2 | halo do ícone no `FloatingTimer` e no `RunningNowPanel` |
| `animate-pulse-slow` | 1 | keyframe customizado no CSS (`opacity 1 → 0.7`, 3s) |

Transições comuns: `transition-colors`, `transition-all duration-200`,
`hover:-translate-y-0.5` (elevação tátil de cartões), `active:scale-[0.98]` (botões grandes).

---

## 7. Espaçamento e larguras fixas

| Constante | Valor | Onde |
| --- | --- | --- |
| Altura do TitleBar | `h-14` (56px) | shell |
| Padding de sub-página | `px-6 py-4` (cabeçalho) / `p-6 pb-24` (conteúdo) | todas |
| Cabeçalho do calendário | `px-4 py-3` | exceção |
| Painel esquerdo da tarefa | `480px` fixo | `/task/:id` |
| Painel de notas | `550px` padrão, mín. 360px, reserva 700px | `/task/:id` |
| Coluna zen | `640px` padrão | `/task/:id` |
| Coluna do Kanban | `300px` | lista |
| Janela flutuante | `300px` × (44 × n + 60) | float |
| Captura rápida | `400 × 140` | quick capture |
| Grade do calendário | 1,2px/min → 1h = 72px; 07:00–22:00 | calendário |
| Célula do mês | `min-h-[90px]` | calendário |
| Coluna de dia (semana) | `min-w-[160px]` | plano do dia |
| Larguras máximas de conteúdo | `max-w-2xl` (settings, plano do dia) · `max-w-3xl` (revisão, projeto) · `max-w-4xl` (horizontes) · `max-w-6xl` (dashboard) | — |

Cinco larguras máximas diferentes para conteúdo centralizado.

---

## 8. Ícones

Biblioteca única: **lucide-react**. Tamanhos em uso: 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 32, 40,
48 — treze tamanhos, sem escala definida. Os mais frequentes são 14 e 16.

Emojis aparecem como conteúdo de dados (contextos, áreas, níveis de energia, horizontes de meta), não
como ícones de interface.
