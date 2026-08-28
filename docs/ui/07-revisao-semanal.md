# Revisão semanal — `/review`

`src/renderer/src/pages/WeeklyReviewPage.tsx`

## Função

Conduzir o ritual que, no GTD, mantém o sistema confiável: um checklist de 8 passos, com indicadores
objetivos de saúde do sistema ao lado, registrado no histórico ao final.

A tela tem **dois estados mutuamente exclusivos**: com revisão em andamento e sem.

## Cabeçalho

`← Voltar` · divisor · `ClipboardCheck` · "Revisão Semanal". À direita, o botão **Iniciar Revisão**
(`bg-emerald-600`, ícone `Play`) — que **desaparece** quando já existe revisão em andamento, deixando
o lado direito vazio.

Corpo em `max-w-3xl mx-auto`.

---

## Estado A — nenhuma revisão em andamento

### 1. Cartão de convite

`bg-blue-50 border-blue-200`, centralizado:

- `ClipboardCheck` de 48px em azul;
- título "Revisão Semanal GTD";
- parágrafo: *"A Revisão Semanal é o hábito que mantém o sistema GTD confiável. Reserve um tempo para
  revisar suas listas, projetos e compromissos."*;
- botão **Iniciar Revisão Semanal** (`bg-blue-600`).

Note que o mesmo comando aparece duas vezes na tela, em duas cores diferentes: esmeralda no
cabeçalho, azul no cartão.

### 2. Saúde do Sistema

Título de seção `text-sm font-bold uppercase tracking-wider text-slate-400`, seguido de uma grade
`grid-cols-2 md:grid-cols-3 gap-3` com cinco `HealthCard`.

### 3. Histórico de Revisões

Título com ícone `History`. Lista só as revisões **concluídas**:

- data e hora de início por extenso (`quinta-feira, 28 de agosto de 2026, 09:15`);
- notas em `line-clamp-1`, se houver;
- badge verde **"Inbox Zero"** quando `inbox_cleared`;
- `CheckCircle2` esmeralda à direita.

Não há paginação nem filtro — o histórico cresce indefinidamente.

---

## Estado B — revisão em andamento

### 1. Banner de progresso

`bg-emerald-50 border-emerald-200`:

- esquerda: "Revisão em andamento" + "Iniciada em {data por extenso}";
- direita: `{feitos}/8` em `text-lg font-bold` + "itens concluídos";
- abaixo, barra de 8px `bg-emerald-500` com a fração concluída.

### 2. Saúde do Sistema

Os mesmos cinco `HealthCard` do estado A, agora **sem título de seção** — aparecem soltos entre o
banner e o checklist.

### 3. Checklist

Título "Checklist da Revisão". Oito botões de largura total, cada um alternando o próprio estado:

| # | id | Rótulo | Ícone | Descrição |
| --- | --- | --- | --- | --- |
| 1 | `collect` | Coletar itens soltos | `Inbox` | Reúna papéis, recibos, notas e pensamentos que ficaram fora do sistema. |
| 2 | `process_inbox` | Processar Inbox | `ClipboardCheck` | Alcance Inbox Zero — classifique cada item: ação, projeto, referência ou lixo. |
| 3 | `review_next` | Revisar Próximas Ações | `Calendar` | As próximas ações ainda são relevantes? Alguma pode ser concluída ou removida? |
| 4 | `review_projects` | Revisar Projetos | `FolderKanban` | Cada projeto ativo tem progresso? Existe próxima ação definida? |
| 5 | `review_waiting` | Revisar Aguardando | `Hourglass` | Alguém respondeu? Precisa fazer follow-up em algo pendente? |
| 6 | `review_someday` | Revisar Someday/Maybe | `Lightbulb` | Algum item está pronto para ser ativado? Algum pode ser descartado? |
| 7 | `review_calendar` | Revisar Calendário | `Clock` | O que vem na próxima semana? Precisa preparar algo? |
| 8 | `creative` | Pensamento Criativo | `Sparkles` | Que mais precisa de atenção? Novos projetos ou ideias? |

Cada item:
- `CheckCircle2` esmeralda quando marcado, `Circle` cinza quando não;
- rótulo em `font-semibold`, **riscado e esmeralda** quando marcado;
- descrição em `text-xs text-slate-500`;
- o cartão inteiro ganha `border-emerald-200 bg-emerald-50/50` quando marcado.

Marcar o item 2 (`process_inbox`) grava também o campo `inbox_cleared` da revisão — é o que gera o
badge "Inbox Zero" no histórico.

**Nenhum item leva à tela correspondente.** "Revisar Projetos" não abre `/projects`, "Revisar
Calendário" não abre `/calendar`. O usuário navega por conta própria e volta — e, ao voltar, a
revisão continua onde estava (o estado vive no banco).

### 4. Notas e conclusão

Cartão branco com:
- título "Notas da Revisão";
- `Textarea` de 3 linhas, placeholder "Observações, insights, próximos passos...";
- botão de largura total que **só habilita com os 8 itens marcados**. Desabilitado:
  `bg-slate-200 text-slate-400` com o rótulo *"Complete todos os 8 itens para finalizar"*.
  Habilitado: `bg-emerald-600` com *"Concluir Revisão Semanal"*.

---

## `HealthCard` — indicadores de saúde

Cinco métricas calculadas no banco (`review:healthIndicators`). Cada uma é um cartão
`flex items-center gap-3` com um quadrado de 32px à esquerda e número + rótulo à direita.

| Rótulo | Métrica | Ícone | Alerta quando |
| --- | --- | --- | --- |
| Inbox | tarefas com status `inbox` | `Inbox` | > 0 |
| Projetos sem ação | projetos ativos sem tarefa `proximas` | `FolderKanban` | > 0 |
| Aguardando >7d | tarefas `aguardando` paradas há mais de 7 dias | `Hourglass` | > 0 |
| Próximas >14d | tarefas `proximas` paradas há mais de 14 dias | `Calendar` | > 0 |
| Someday/Maybe | tarefas `someday` | `Lightbulb` | nunca |

Em alerta, o cartão fica `bg-amber-50 border-amber-200`, o número vira `text-amber-700` e **o ícone
próprio é substituído por `AlertTriangle`** — ou seja, um cartão em alerta perde a identidade visual
da métrica que representa.

O card "Someday/Maybe" nunca alerta, o que é correto conceitualmente mas o deixa visualmente idêntico
a um indicador saudável de outra natureza.
