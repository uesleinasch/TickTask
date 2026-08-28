# Plano do dia — `/today`

`src/renderer/src/pages/TodayPage.tsx`

## Função

Responder "o que eu faço hoje, e nessa ordem?". É a materialização do horizonte H0 do GTD.

A tela tem duas abas: **Hoje** (lista ordenável manualmente) e **Esta Semana** (panorama de sete
dias, somente leitura).

Uma tarefa entra aqui quando tem `scheduled_date` igual à data de hoje — definido pelo botão "Hoje"
nas listagens, pelo campo "Programado para" no detalhe, ou arrastando no calendário mensal.

## Cabeçalho

Três blocos em `justify-between`:

1. **← Voltar** para `/`.
2. **Centro:** ícone `CalendarDays` azul + "Hoje" em `text-lg font-bold` + a data por extenso
   (`quinta-feira, 28 de agosto`) em `text-sm text-slate-500`.
3. **Indicador de carga** — só na aba Hoje e só se houver ao menos um limite de tempo definido.

### Indicador de carga

Cartão branco com ícone `Clock` (verde ou vermelho) e:

- **soma dos limites de tempo** das tarefas de hoje, em negrito, seguida de `/ 8h`;
- `AlertTriangle` vermelho quando a soma passa de 8h;
- barra de 6px e 128px de largura, verde ou vermelha, preenchida pela porcentagem do dia útil
  (limitada a 100%);
- contador `{finalizadas}/{total} feitas`.

A jornada de 8 horas é uma constante fixa no código (`WORK_DAY_HOURS = 8`), sem opção de ajuste.

> O indicador soma **limites planejados**, não tempo já gasto. É uma leitura de compromisso
> assumido, não de esforço realizado — distinção que a interface não explicita.

## Abas

Duas pílulas no padrão da casa (`bg-slate-900 text-white` quando ativas), numa faixa branca própria
com borda inferior:

- **Hoje** (`CalendarDays`) — com badge de contagem quando há tarefas
- **Esta Semana** (`Calendar`) — sem contador

## Aba "Hoje"

Lista vertical em `max-w-2xl` com `space-y-2`, reordenável por arraste (`@dnd-kit`, sensores de
ponteiro e teclado).

### Linha de tarefa (`SortableTaskRow`)

```
[⠿] [◉] Nome da tarefa  [Status] [Prazo]        00:45:00
        ● Projeto                                / 02:00:00
```

| Elemento | Detalhe |
| --- | --- |
| Alça de arraste | `GripVertical` cinza-claro, `cursor-grab` / `active:cursor-grabbing`. Só ela inicia o arraste |
| Indicador de estado | `CheckSquare` roxo se finalizada · `Activity` esmeralda pulsante se rodando · `Lock` laranja se bloqueada · círculo vazio caso contrário |
| Nome | `font-medium`, riscado e cinza quando finalizada |
| `StatusBadge` | sempre |
| `DueDateBadge` | se houver prazo |
| Projeto | segunda linha: bolinha da cor + nome, em `text-xs text-slate-400` |
| Tempo | `font-mono`, esmeralda se rodando; abaixo, `/ limite` quando existe |

Tarefas bloqueadas ganham `border-l-4 border-l-orange-300`. Durante o arraste, a linha fica com
`opacity-0.5` e sombra maior.

Clicar no corpo da linha (não na alça) navega para `/task/:id`.

### Persistência da ordem

Ao soltar, a nova ordem é aplicada otimisticamente na tela e gravada em seguida: uma chamada
`updateDayOrder(taskId, índice)` **por tarefa**, em paralelo. Uma lista de 40 itens dispara 40
chamadas IPC.

### Estado vazio

`CalendarDays` de 40px, "Nenhuma tarefa programada para hoje" e a dica *"Use o botão 📅 nas tarefas
para programá-las para hoje."* — a única referência a um emoji que não existe na interface (o botão
real é textual, com ícone `CalendarDays`).

## Aba "Esta Semana"

Sete colunas em `flex gap-3 overflow-x-auto`, cada uma `flex-1 min-w-[160px]`.

### Coluna de dia (`DayColumn`)

Cabeçalho centralizado:
- dia da semana abreviado (`seg`, `ter`) em maiúsculas;
- dia/mês em `text-sm font-bold`;
- soma dos limites de tempo do dia, quando houver.

Corpo (`max-h-64`, rolável): cada tarefa é um botão de largura total com nome truncado e
`DueDateBadge` abaixo quando há prazo. Tarefas finalizadas ficam com `opacity-50` e riscadas. Se
não houver nada: "Vazio" em `text-xs text-slate-300`.

O dia de hoje ganha `border-blue-300 shadow-md` e cabeçalho `bg-blue-50` com texto azul.

**A visão semanal é somente leitura**: não há arraste entre dias aqui — isso só existe no calendário
mensal (`/calendar`).

## Sobreposição com outras telas

Esta tela divide território com duas outras, o que é o principal ponto a resolver num redesenho:

| Recurso | `/today` | `/calendar` (semana) | `/horizons` (H0) |
| --- | --- | --- | --- |
| Tarefas agendadas para hoje | lista ordenável | linha "Dia" (máx. 2 + "+N") | lista simples |
| Panorama da semana | 7 colunas, leitura | grade horária completa | — |
| Reagendar arrastando | não | sim (só no modo mês) | — |
| Blocos de tempo | não mostra | sim | não mostra |
| Carga do dia | sim (vs. 8h) | não | não |
