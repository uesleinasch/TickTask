# Calendário — `/calendar`

`src/renderer/src/pages/CalendarPage.tsx` (~890 linhas)

## Função

Duas coisas que compartilham o mesmo cabeçalho mas resolvem problemas diferentes:

- **Visão semanal** — *time blocking*: reservar horas do dia para tarefas específicas, numa grade de
  07:00 às 22:00.
- **Visão mensal** — panorama de agendamentos, com **arraste para reagendar** tarefas entre dias.

A visão semanal é o padrão ao abrir a tela.

## Cabeçalho

Mais compacto que o das outras sub-páginas (`px-4 py-3` em vez de `px-6 py-4`), dividido em três:

**Esquerda:** botão `←` só com ícone + `Calendar` azul + "Calendário" em `text-base font-semibold`.

**Centro — navegação temporal:**
- botão **Hoje** (contorno, 32px) — volta a semana e o mês para a data atual;
- `‹` / `›` — avançam 7 dias ou 1 mês, conforme a visão;
- rótulo do período entre as setas, com `min-w-[200px] text-center`:
  - semana no mesmo mês: `4–10 Agosto 2026`
  - semana virando o mês: `28 Julho – 3 Agosto 2026`
  - mês: `Agosto 2026`

**Direita:**
- alternador **Mês** | **Semana** num contêiner `rounded-lg border overflow-hidden` (o ativo fica
  `bg-slate-900 text-white`);
- botão **+ Bloco** em `bg-blue-600` — o único botão de ação azul do app; em todas as outras telas a
  ação primária é `bg-slate-900`.

## Visão semanal

### Geometria da grade

| Constante | Valor |
| --- | --- |
| Primeira hora | 07:00 |
| Última hora | 22:00 |
| Escala | 1,2 px por minuto → **1 hora = 72px** |
| Altura total | 15h × 72px = **1080px** |
| Coluna de horas | 56px (`w-14`) |

Horários fora de 07:00–22:00 simplesmente não têm onde ser desenhados.

### Linha "Dia" (all-day)

Faixa fixa acima da grade, com fundo branco e borda inferior. A primeira célula (56px) só diz "Dia".
Cada coluna de dia mostra:

- dia da semana abreviado e o número do dia num círculo (azul preenchido se for hoje);
- até **duas** tarefas agendadas, como botões azul-claro truncados;
- `+N` quando há mais.

Clicar numa tarefa navega para `/task/:id`.

### Grade horária

- **Linhas de hora** em `border-slate-100`; **linhas de meia hora** em `border-slate-50` — quase
  invisíveis, servem só de guia para o snap.
- Rótulos de hora à esquerda, alinhados à direita, em `text-xs text-slate-400`, deslocados 8px para
  cima para ficarem sobre a linha.
- **Linha do "agora"** — traço vermelho de 2px com uma bolinha de 12px à esquerda, desenhado só na
  coluna de hoje e só se o horário atual estiver dentro da faixa. Ao montar, a tela faz
  `scrollIntoView({ block: 'center' })` nessa linha.
- A coluna de hoje tem fundo `bg-blue-50/30`; o cursor sobre a grade é `crosshair`.

### Criar bloco pela grade

Clicar em qualquer ponto vazio da coluna:

1. converte a posição Y em minutos;
2. arredonda para o múltiplo de **30 minutos** mais próximo;
3. limita o início a no máximo 21:00 e propõe **1 hora** de duração;
4. abre o diálogo já preenchido com data, início e fim.

### Bloco de tempo (`TimeBlockCard`)

Posicionado em absoluto dentro da coluna, `left-0.5 right-0.5`, com altura proporcional à duração
(mínimo 20px). Cor de fundo **pela categoria da tarefa**:

| Categoria | Classe |
| --- | --- |
| urgente | `bg-red-400 border-red-500` |
| prioridade | `bg-orange-400 border-orange-500` |
| normal | `bg-blue-400 border-blue-500` |
| time_leak | `bg-yellow-400 border-yellow-500` |

Conteúdo, revelado por faixas de altura:

- **sempre:** nome da tarefa em `font-semibold truncate`;
- **acima de 30px:** `07:00–08:30` e, para blocos de 1h ou mais, a duração entre parênteses;
- **acima de 50px:** botão **Timer** (`Play`), revelado no hover, que inicia o cronômetro da tarefa
  sem sair do calendário.

Clicar no bloco abre o diálogo em modo edição.

**Não há arraste nem redimensionamento de blocos** — mover ou reduzir um bloco exige abrir o diálogo
e digitar os horários.

## Visão mensal

Grade `grid-cols-7`. Cabeçalho com `Dom … Sáb` em `bg-slate-50`. As células fora do mês (padding do
início e do fim) ficam `bg-slate-50/50`.

### Célula de dia (`DroppableDayCell`)

`min-h-[90px] p-1.5 border border-slate-200`, clicável (abre o diálogo de bloco já com a data).

- Número do dia em `w-6 h-6 rounded-full`; se for hoje, círculo azul preenchido e a célula inteira
  ganha `bg-blue-50 border-blue-300`.
- Badge `N⏱` em `bg-orange-100 text-orange-600` quando há blocos de tempo naquele dia.
- Até **três** chips de tarefa (`DraggableTaskChip`) + `+N mais`.
- Sendo alvo de um arraste: `bg-emerald-50 border-emerald-400 ring-1 ring-emerald-300`.

### Chip de tarefa arrastável

Pílula azul-clara com `GripVertical` e o nome truncado. `cursor-grab`, ativação após 5px de
movimento (para não confundir com clique). Clicar navega para a tarefa; arrastar e soltar em outro
dia **reagenda** (`scheduled_date`) e emite o toast "Tarefa reagendada!".

Enquanto o arraste está ativo, uma etiqueta escura fixa aparece em `bottom-4 right-4`: **"Solte em um
dia para reagendar"**.

## Diálogo de bloco de tempo

`sm:max-w-md`. Título "Novo Bloco de Tempo" ou "Editar Bloco de Tempo".

| Campo | Controle |
| --- | --- |
| Tarefa * | `SearchableSelect`, alimentado por `listActiveTasksLight()` — só tarefas ativas, carregado ao abrir o diálogo |
| Data * | `input[type=date]` |
| Início * \| Fim * | dois `input[type=time]` lado a lado |

Abaixo dos horários, a **duração calculada** em texto (`Duração: 1h 30min`). Validação: início
precisa ser anterior ao fim, senão toast de erro.

Rodapé: **Excluir** (vermelho, `mr-auto`, só em edição) · **Cancelar** · **Salvar** (desabilitado sem
tarefa).

Depois de salvar ou excluir, **as duas visões são recarregadas** — criar um bloco na semana atualiza
o contador `N⏱` no mês.

## Legenda (rodapé fixo)

Faixa branca com borda superior, em `text-xs text-slate-500`:

| Amostra | Rótulo |
| --- | --- |
| quadrado azul-claro com borda | Agendado |
| quadrado azul sólido | Bloco normal |
| quadrado laranja | Bloco urgente |
| traço vermelho | Agora |

Mais uma dica contextual, que muda com a visão: *"Clique na grade para criar bloco"* (semana) ou
*"Arraste tarefas entre dias"* (mês).

A legenda cita só duas das quatro cores de bloco, e chama a cor laranja de "urgente" quando na
verdade laranja é **prioridade** (urgente é vermelho).
