# Inconsistências e pontos de atrito

Levantamento factual do que hoje está incoerente, duplicado ou ausente na interface. Não é uma lista
de bugs — nada aqui quebra o app. É o insumo direto para decidir o escopo de uma refatoração visual.

Cada item traz **o que é**, **onde acontece** e, quando relevante, **por que importa**.

---

## A. Sistema visual

### A1. Três paletas para status de tarefa, quatro para categoria

Ver a tabela completa em [14-design-tokens.md](14-design-tokens.md#5-paletas-semânticas).

O caso mais visível: **time leak é amarelo** no badge, no `CategorySelect` e no bloco do calendário,
mas **roxo** no acento da tela de tarefa e no gráfico do dashboard. E `finalizada` é roxo no badge,
esmeralda no dashboard.

### A2. Exports de cor mortos em `shared/types.ts`

`STATUS_COLORS` e `CATEGORY_COLORS` estão exportados e não são importados por ninguém. `CalendarPage`
e `DashboardPage` declararam cópias locais em vez de usá-los. `ContextsPage` duplica literalmente
`DEFAULT_COLORS` como `CONTEXT_COLORS`.

### A3. Duas gramáticas de badge

Status de **tarefa** é pílula clara com borda e texto escuro. Status de **projeto** é pílula sólida
com texto branco. Ambos aparecem em listas do mesmo app.

### A4. Cinco raios de borda sem regra

`rounded-sm` (65×), `rounded-md` (36×), `rounded-lg` (83×), `rounded-full` (82×) e `rounded-2xl`
(2×, só na captura rápida). Um cartão pode ser `rounded-sm` e conter blocos `rounded-lg`.

### A5. Sombras sobreviveram à migração "flat"

`shadow-sm` foi removido dos cartões, mas restam `shadow-xs`, `shadow-md`, `shadow-lg`, `shadow-xl` e
`shadow-2xl` — cinco intensidades em circulação.

### A6. Tokens de fonte apontam para variáveis inexistentes

`--font-sans: var(--font-geist-sans)` e `--font-mono: var(--font-geist-mono)`, e nenhuma das duas
é definida. É provável que a utilidade `font-mono` não aplique família monoespaçada nenhuma — o que
afetaria o cronômetro de `text-8xl`, o elemento mais proeminente do app.
**Requer confirmação visual no app rodando.**

### A7. Tema escuro definido e desligado

O CSS traz o bloco `.dark` completo (20 tokens). Nada no app adiciona essa classe, e não há
alternador em `/settings`.

### A8. Três primitivos do shadcn não usados

`Card`, `Badge` e `Tabs` estão no repositório e **nenhuma tela os importa**. Cada uma reimplementou o
mesmo desenho na mão: cartões como `bg-white border border-slate-200 rounded-sm`, abas como botões
`rounded-full`, badges como `<span>` com classes literais. Seis das oito barras de progresso do app
são `<div>` com `width` inline em vez do primitivo `Progress`.

### A9. Componentes mortos

`components/Timer.tsx` e `components/Versions.tsx` não são importados por nenhum arquivo.

---

## B. Navegação e casca

### B1. Onze botões numa barra única, só na home

O `TitleBar` renderiza a navegação **exclusivamente na rota `/`**. Em qualquer outra tela, ir de
`/projects` para `/calendar` exige voltar à home primeiro. Em 1024px de largura (a largura padrão da
janela), os onze botões ocupam praticamente toda a barra.

### B2. Botão "Voltar" com quatro implementações

| Tela | Implementação | Destino |
| --- | --- | --- |
| maioria | `<Button variant="ghost">` com "← Voltar" | `/` |
| detalhe do projeto | `<Button variant="ghost">` com "← Projetos" | `/projects` |
| detalhe da tarefa | `<button>` cru com "← Voltar" | `navigate(-1)` (histórico) |
| calendário / horizontes | `<Button size="sm">` só com o ícone | `/` |

### B3. Ação primária em quatro cores

`bg-slate-900` (maioria) · `bg-blue-600` (botão "+ Bloco" no calendário, "Salvar Alterações" e
"Iniciar Revisão" do cartão azul) · `bg-emerald-600` ("Iniciar Revisão" do cabeçalho, "Sincronizar
Todas as Tarefas") · `bg-indigo-600` ("Novo Objetivo" nos horizontes).

Na revisão semanal, **o mesmo comando aparece duas vezes na mesma tela em duas cores diferentes**.

### B4. Configurações escondidas atrás de um ícone sem rótulo

É o único item do `TitleBar` sem texto, e o único `variant="ghost"` da barra.

### B5. O comportamento de "fechar" nunca é explicado onde importa

Fechar a janela esconde o app na bandeja. O único lugar que diz isso é uma nota de rodapé em
`/settings` — tela que o usuário pode nunca abrir.

---

## C. Sobreposição funcional

### C1. Quatro telas mostram tarefas agendadas

| Tela | O que oferece que as outras não têm |
| --- | --- |
| `/today` aba Hoje | ordenação manual por arraste, indicador de carga vs. 8h |
| `/today` aba Semana | 7 dias em colunas, somatório por dia |
| `/calendar` semana | grade horária, blocos de tempo, linha do "agora" |
| `/calendar` mês | arraste para reagendar entre dias |
| `/horizons` H0 | contexto vertical (do H0 ao H5) |

Nenhuma delas faz o conjunto. Reagendar arrastando só existe no mês; ordenar o dia só existe em
`/today`; ver blocos de tempo só existe no calendário.

### C2. Três desenhos para "timers em execução"

`FloatingTimer` (pílula preta fixa), `RunningNowPanel` (painel esmeralda no dashboard) e
`FloatTimerPage` (janela escura). Mesma informação, três layouts, três conjuntos de ações.

### C3. `/archived` é um filtro promovido a tela

`listTasks` já aceita `archived: true`. A tela dedicada reimplementa uma listagem pobre: sem clique
para abrir a tarefa, sem busca, sem filtro, sem ações em massa, sem projeto/tags/prazo no cartão.

### C4. Contextos e Tags são a mesma tela duas vezes

Mesma estrutura (cabeçalho, faixa azul, grade de cartões, diálogo), com recursos distribuídos de
forma arbitrária: contextos têm emoji e preview ao vivo mas não mostram uso; tags mostram uso e têm
mesclagem, mas não têm ícone nem preview.

---

## D. Terminologia

### D1. "Tag" tem três nomes

- filtro na lista de tarefas: **"Fonte / Tag"**
- campo no diálogo de nova tarefa: **"Fontes / Tags"**
- tela dedicada e botão do TitleBar: **"Tags"**

### D2. "Arquivadas" vs. "Arquivo Morto"

O botão que leva à tela diz "Arquivadas"; o título da tela diz "Arquivo Morto".

### D3. `DeleteConfirmDialog` genérico fala em "tarefa" para tudo

O texto padrão é *"Esta ação não pode ser desfeita. Isso irá deletar permanentemente a tarefa."* —
exibido também ao excluir **contextos** e ao apagar tarefas arquivadas. Só a tela de tags
personaliza o texto (e o faz muito bem, citando quantas tarefas serão afetadas).

### D4. Legenda do calendário está incorreta

O rodapé chama o quadrado laranja de **"Bloco urgente"**, mas laranja é a cor de **prioridade** —
urgente é vermelho. A legenda também cita só duas das quatro cores de categoria.

### D5. Dica com emoji que não existe na interface

O estado vazio de `/today` diz *"Use o botão 📅 nas tarefas para programá-las para hoje."* O botão
real é textual ("Hoje") com um ícone `CalendarDays`, não um emoji.

---

## E. Lacunas funcionais

### E1. Não se cria tarefa dentro de um projeto

`/project/:id` lista as tarefas mas não tem botão de adicionar. O estado vazio instrui o usuário a
sair, abrir cada tarefa e selecionar o projeto lá.

### E2. Área de foco de projeto não é editável pela interface

O campo existe, aparece como etiqueta em `/horizons`, e só o **servidor MCP** consegue gravá-lo. Um
projeto criado pela interface nunca terá área — o que esvazia o H2 dos horizontes.

### E3. Rótulos não navegam para o que rotulam

Clicar num contexto, numa tag, numa área ou numa meta não filtra nem abre nada. As duas telas de
taxonomia são becos sem saída.

### E4. O dashboard não leva a lugar nenhum

Nenhuma métrica, alerta ou item de lista é clicável (exceto o painel de timers). "3 projetos parados"
não abre os projetos parados.

### E5. A revisão semanal não conduz à revisão

Nenhum dos 8 itens do checklist abre a tela correspondente. "Revisar Projetos" é apenas um texto com
uma caixa de marcar.

### E6. Áreas e metas se excluem sem confirmação

Tarefas, projetos, contextos e tags pedem confirmação. Áreas e metas somem no clique.

### E7. Blocos de tempo não se arrastam nem se redimensionam

Mover um bloco de 09:00 para 10:00 exige abrir o diálogo e digitar os dois horários.

### E8. `/settings` não tem nenhuma preferência de aplicativo

Só integrações. Não há tema, densidade, idioma, jornada de trabalho (fixa em 8h), limiares de time
leak (1h/30min), faixa horária do calendário (07:00–22:00), intervalo de auto-sync (60s), atalho
global (fixo), backup ou versão do app.

---

## F. Comportamentos que merecem atenção no redesenho

Não são defeitos, mas condicionam o desenho:

### F1. Altura contida, nunca `100vh`

As páginas usam `h-full` porque o `<main>` já desconta o TitleBar. Com `100vh` sobram 56px, e um
`scrollIntoView` (o Excalidraw dá foco ao canvas ao selecionar) rola esse excedente e esconde a barra
do modo foco atrás do TitleBar, sem volta.

### F2. As três janelas compartilham o bundle

Qualquer efeito colateral no escopo de módulo roda três vezes. A guarda é
`shouldBootstrapTimerStore(hash)`, em `stores/timerWindow.ts`. Novos efeitos globais precisam da
mesma proteção.

### F3. Persistência de preferência com duas convenções de nome

Cinco chaves usam `:` (`ticktask:taskListViewMode`) e duas usam `.` (`ticktask.notesWidth`).

### F4. Agrupar por contexto duplica tarefas

Uma tarefa com três contextos aparece nos três grupos; a soma dos contadores de grupo excede o total
real. É o comportamento correto para o caso de uso, mas precisa ser comunicado.

### F5. A ordem do plano do dia grava uma chamada por tarefa

Reordenar uma lista de 40 itens dispara 40 chamadas IPC em paralelo.

### F6. A busca da lista de tarefas não tem debounce

Cada tecla digitada refaz a consulta.

### F7. O seletor de dependências carrega todas as tarefas

`DependencySelector` chama `listTasks()` sem filtro e filtra no cliente — o único lugar do app que
ainda faz isso.

---

## G. Onde a interface já acerta

Para não perder na refatoração:

- **Botão "Hoje" em toda listagem** — agendar sem navegar, com alternância imediata.
- **Expansão de subtarefas inline**, em card e em tabela, com carregamento sob demanda.
- **Escala visual do Time Leak** — a única semântica que colore o fundo inteiro, e funciona.
- **Painel de notas redimensionável com três modos** (normal, maximizado, zen) e `Esc` para sair.
- **Modo foco com timer embutido** (`NotesFocusBar`) — escrever sem perder o cronômetro de vista.
- **Confirmação de exclusão de tag** — cita quantas tarefas serão afetadas e o que *não* acontece.
- **Preview ao vivo no diálogo de contexto.**
- **Aviso "Sem próxima ação definida"** nos cartões de projeto — o único alerta GTD inline.
- **Linha do "agora" com auto-scroll** na grade semanal.
- **Captura rápida** — atalho global, `autoFocus`, Enter/Esc, confirmação verde e fechamento
  automático. É o fluxo mais bem resolvido do app.
- **Atualização por evento (`tasks:refresh`)** — o que o MCP ou a captura rápida cria aparece sozinho
  na lista aberta.
