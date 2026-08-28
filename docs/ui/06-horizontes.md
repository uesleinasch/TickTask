# Horizontes GTD — `/horizons`

`src/renderer/src/pages/HorizonsPage.tsx` (~770 linhas)

## Função

Reunir numa página só as **seis alturas de perspectiva** do GTD, da ação imediata ao propósito de
vida. É a tela mais "conceitual" do app: não se opera nada aqui além de criar áreas e metas — o resto
é leitura e navegação.

Subtítulo do cabeçalho: *"6 perspectivas para clareza total"*.

## Cabeçalho

`← ` (só ícone) · `Mountain` índigo · título "Visão de Horizonte GTD" + subtítulo · à direita, dois
botões: **Nova Área** (contorno) e **Novo Objetivo** (`bg-indigo-600`, ícone `Star`).

O botão primário aqui é índigo; em quase todo o resto do app é `bg-slate-900`.

## Estrutura: seis seções empilhadas

Conteúdo em `max-w-4xl mx-auto` com `space-y-6`. Cada horizonte é um `<section>` com **borda de 2px**
e fundo tingido pela cor do nível — o único lugar do app que usa `border-2` e fundos coloridos em
blocos grandes.

```
┌──────────────────────────────────────────────────────┐  ← border-2, bg-{cor}-50
│ [▣ ícone]  H2 — Áreas de Foco               (4) [+] │
│            Responsabilidades e papéis                │
├──────────────────────────────────────────────────────┤
│  conteúdo da seção                                   │
└──────────────────────────────────────────────────────┘
```

Cabeçalho da seção: quadrado de 32px com a cor sólida e ícone branco · rótulo em `text-sm
font-semibold` na cor do nível · sublabel em `text-xs text-slate-500` · badge de contagem · ação
opcional.

### Configuração dos seis níveis

| Nível | Rótulo | Sublabel | Ícone | Cor | Origem dos dados |
| --- | --- | --- | --- | --- | --- |
| **H0** | Próximas Ações | Tarefas agendadas para hoje | `CalendarDays` | azul | tarefas de hoje **não finalizadas** |
| **H1** | Projetos | Projetos em andamento | `FolderKanban` | esmeralda | projetos com status `active` |
| **H2** | Áreas de Foco | Responsabilidades e papéis | `Layers` | violeta | tabela `areas` |
| **H3** | Metas (1–2 anos) | Objetivos de curto prazo | `Target` | laranja | `goals` com `horizon = 3` |
| **H4** | Visão (3–5 anos) | Onde você quer estar | `Compass` | rosa | `goals` com `horizon = 4` |
| **H5** | Propósito | Princípios e razão de ser | `Telescope` | índigo | `goals` com `horizon = 5` |

Metas também têm um emoji por horizonte: 🎯 (H3), 🔭 (H4), ✨ (H5).

## Conteúdo de cada seção

### H0 — Próximas Ações

Lista de linhas brancas clicáveis (`hover:border-blue-300 hover:bg-blue-50`):

```
[○] Nome da tarefa            ● Projeto      🕐 28 ago
```

- círculo `CheckCircle2` cinza que fica azul no hover (decorativo — **não conclui a tarefa**);
- nome em `text-sm font-medium`;
- projeto com bolinha da cor, se houver;
- prazo em laranja com `Clock`, se houver.

Vazia: "Nenhuma tarefa agendada para hoje." + botão **"Ir para Plano do Dia"**.

### H1 — Projetos

Grade `grid-cols-1 sm:grid-cols-2 gap-3`. Cada projeto é um cartão com:
- nome (fica esmeralda no hover) e, à direita, a **etiqueta da área** em `bg-slate-100`, se houver;
- **próxima ação** prefixada por `→`, em `line-clamp-1`;
- `{feitas}/{total} tarefas`, porcentagem e `Progress` de 6px.

Vazia: botão **"Ir para Projetos"**.

### H2 — Áreas de Foco

Ação no cabeçalho: **+ Adicionar** (violeta).

Lista de linhas com:
- emoji de 24px numa caixa de 32px;
- nome + badge violeta `N projetos` (contando só os `active` daquela área);
- descrição em `line-clamp-1`;
- **editar** (`Pencil`) e **excluir** (`Trash2`), revelados no hover.

Excluir não pede confirmação: remove direto e mostra o toast "Área ... removida."

### H3 / H4 / H5 — Metas, Visão, Propósito

Três seções idênticas em estrutura, alimentadas pelo mesmo `goals` filtrado por horizonte. Cada meta
é uma linha com:
- emoji do horizonte;
- nome + etiqueta da área em `bg-slate-100`;
- descrição em `whitespace-pre-wrap` (preserva quebras de linha — é o único texto do app que faz
  isso);
- editar e excluir no hover, também sem confirmação.

Cada seção tem seu próprio botão **+ Adicionar**, mas todos abrem o **mesmo diálogo com horizonte
padrão H3** — adicionar a partir da seção H5 não pré-seleciona H5.

## Diálogos

### Nova / Editar Área de Foco

`sm:max-w-md`. Descrição: "Preencha os dados da área de foco."

| Campo | Controle |
| --- | --- |
| Ícone | 12 emojis em botões de 36px: 🎯 💼 🏋️ 🧠 🏠 ❤️ 🌱 💰 🎨 📚 🤝 ⚡. Selecionado: `border-violet-500 bg-violet-50` |
| Nome * | `Input` com `autoFocus`, placeholder "Ex: Carreira, Saúde, Família..." |
| Descrição | `Textarea` 2 linhas |

### Novo / Editar Objetivo

`sm:max-w-md`. Descrição: "Preencha os dados do objetivo."

| Campo | Controle |
| --- | --- |
| Horizonte * | `Select` com as três opções, cada uma com emoji: `🎯 H3 — Metas (1–2 anos)`, `🔭 H4 — Visão (3–5 anos)`, `✨ H5 — Propósito e princípios` |
| Nome * | `Input` com `autoFocus`, placeholder "Ex: Tornar-me líder técnico sênior..." |
| Área de Foco | `Select` com "Nenhuma área" + as áreas (`emoji nome`) |
| Descrição | `Textarea` 3 linhas |

## Carregamento

Uma única mensagem, "Carregando horizontes...", enquanto **qualquer** das quatro fontes (áreas,
metas, projetos, tarefas de hoje) ainda estiver carregando — mas as seções renderizam vazias por
baixo dela, porque a mensagem não substitui o conteúdo, apenas precede.

## Observações para o redesenho

- **É a única tela que dá sentido vertical ao sistema.** Ela conecta a tarefa de hoje ao propósito,
  mas não há navegação de volta: não se clica numa meta para ver os projetos que a servem, nem numa
  área para filtrar tarefas.
- **A escala de cores dos seis níveis** (azul → esmeralda → violeta → laranja → rosa → índigo) não
  segue nenhuma progressão perceptual; são seis cores distintas em vez de uma escala.
- **Áreas e metas não têm confirmação de exclusão**, ao contrário de tarefas, projetos, contextos e
  tags.
