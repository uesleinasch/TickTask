# TickTask — Roadmap GTD

> **Versão atual:** 2.1.6
> **Atualizado em:** 2026-03-20
> **Metodologia:** Getting Things Done (David Allen)

---

## Estado atual da aplicação

### Funcionalidades implementadas

| Área | Recursos |
|------|----------|
| Tarefas | CRUD completo, status de 5 estágios, categorias, tags, arquivamento |
| Timer | Timer ativo, entradas de tempo, limite de tempo, alertas de time leak |
| Janela flutuante | Timer persistente, always-on-top, controle de restauração |
| Dashboard | Estatísticas semanais, heatmap anual, distribuição por status/categoria |
| Sincronização | Integração com Notion (leitura/escrita) |
| UI | Visão em cards e tabela, filtros por status/categoria/tag/busca |

### Lacunas em relação ao GTD puro

- Sem lista "Someday/Maybe"
- Sem estrutura de Projetos (apenas tarefas soltas)
- Sem revisão semanal assistida
- Sem tarefas recorrentes
- Sem subtarefas ou hierarquia
- Sem dependências entre tarefas
- Sem contextos além de tags
- Sem visão de calendário/bloqueio de tempo
- Sem captura rápida global (hotkey de sistema)
- Sem processamento guiado do Inbox

---

## Fases do Roadmap

---

## FASE 1 — Fundação GTD (v3.0)
> **Objetivo:** Completar os pilares centrais do GTD que ainda estão ausentes.
> **Prioridade:** Alta — sem isso, a metodologia está incompleta.

---

### 1.1 — Estrutura de Projetos

**O que é no GTD:**
No GTD, um "Projeto" é qualquer resultado desejado que requer mais de uma ação. Toda tarefa ativa deve pertencer a um projeto ou ser uma ação solta.

**O que implementar:**

- **Entidade `Project`** no banco de dados:
  - `id`, `name`, `description`, `status` (active | someday | done | archived)
  - `outcome` (resultado desejado — campo de texto longo)
  - `due_date` (opcional)
  - `created_at`, `updated_at`

- **Relacionamento `task.project_id`** (FK opcional — tarefas soltas continuam válidas)

- **ProjetsPage** nova página dedicada:
  - Lista de projetos agrupados por status
  - Tarefas vinculadas ao projeto
  - Progresso do projeto (% de tarefas concluídas)
  - Ação principal do projeto (próxima tarefa com status "Próximas")

- **Visão de Projeto no TaskListPage:**
  - Agrupamento de tarefas por projeto
  - Indicador visual de projeto na TaskCard

**Banco de dados (migrations):**
```sql
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  outcome TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active','someday','done','archived')),
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL;
```

---

### 1.2 — Lista Someday/Maybe

**O que é no GTD:**
Repositório de ideias, desejos e possibilidades que você não se compromete a fazer agora, mas não quer perder. Revisada na Revisão Semanal.

**O que implementar:**

- **Status adicional `someday`** na tabela `tasks` e nos projetos
- **Tab "Someday/Maybe"** no TaskListPage (ao lado de Inbox, Próximas, etc.)
- **Ação de mover** qualquer tarefa/projeto para Someday com um clique
- **Lembrete na Revisão Semanal** para revisar a lista

---

### 1.3 — Contextos (além de tags genéricas)

**O que é no GTD:**
Contextos definem *onde* ou *com quê* uma ação pode ser feita: `@computador`, `@telefone`, `@reunião`, `@compras`, `@casa`. Filtrar por contexto mostra o que você pode fazer agora dado seu ambiente.

**O que implementar:**

- **Entidade `Context`** no banco:
  - `id`, `name` (ex: "@computador"), `icon` (emoji), `color`

- **Relacionamento `task_contexts`** (muitos-para-muitos, igual a tags)

- **Filtro por contexto** no TaskListPage — dropdown ou barra lateral

- **Contextos padrão** pré-cadastrados:
  - `@computador`, `@telefone`, `@reunião`, `@email`, `@leitura`, `@compras`, `@casa`, `@escritório`

- **ContextsPage** para gerenciar contextos disponíveis

> **Nota:** A diferença entre Context e Tag: Tags são temáticas (projeto, área), Contextos são condicionais (onde/com quê você pode executar).

---

### 1.4 — Captura Rápida Global

**O que é no GTD:**
A captura deve ser imediata e sem fricção. A ideia entra na mente, vai direto para o Inbox — sem precisar abrir o app.

**O que implementar:**

- **Hotkey global de sistema** (ex: `Ctrl+Shift+Space` ou configurável):
  - Registrada no `globalShortcut` do Electron
  - Abre uma janela mínima (300x120px, frameless)
  - Campo de texto simples + botão Capturar
  - `Enter` salva diretamente no Inbox e fecha

- **Janela de captura rápida (`QuickCaptureWindow`):**
  - Sempre-no-topo
  - Sem barra de título (apenas campo + ícone)
  - Fecha com `Escape`
  - Notificação toast "Capturado para Inbox"

- **Configuração da hotkey** na SettingsPage

---

### 1.5 — Revisão Semanal Assistida

**O que é no GTD:**
A Revisão Semanal é o hábito que mantém o sistema confiável. Sem ela, o GTD entra em colapso. Deve ser guiada, com checklist e reflexão.

**O que implementar:**

- **WeeklyReviewPage** nova página:
  - Checklist interativo com as etapas do GTD:
    1. Coletar papéis soltos, recibos, notas
    2. Processar o Inbox (zero inbox)
    3. Revisar lista de Próximas Ações
    4. Revisar Projetos (está avançando?)
    5. Revisar Aguardando (alguma resposta chegou?)
    6. Revisar Someday/Maybe (alguma virou ação?)
    7. Revisar o Calendário (próxima semana)
    8. Ser criativo — o que mais precisa de atenção?

  - **Indicadores visuais** de saúde do sistema:
    - Quantidade de itens no Inbox
    - Projetos sem próxima ação definida
    - Tarefas em "Aguardando" há mais de 7 dias
    - Tarefas em "Próximas" há mais de 14 dias sem execução

  - **Histórico de revisões** (data, duração, itens processados)

  - **Lembrete recorrente** (notificação no sistema, dia/hora configurável)

- **Entidade `weekly_review`** no banco:
  ```sql
  CREATE TABLE weekly_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at DATETIME,
    completed_at DATETIME,
    inbox_cleared INTEGER DEFAULT 0,
    notes TEXT,
    checklist_state TEXT  -- JSON com estado do checklist
  );
  ```

---

## FASE 2 — Produtividade Avançada (v3.1)
> **Objetivo:** Ferramentas que amplificam a execução e o planejamento diário.

---

### 2.1 — Planejamento Diário (Daily Review)

**O que é no GTD:**
Antes de iniciar o dia, o GTD recomenda uma revisão rápida: calendário do dia, lista de Próximas Ações, compromissos. Isso define o "plano de batalha" do dia.

**O que implementar:**

- **TodayPage** nova página ("Hoje"):
  - Tarefas selecionadas manualmente para o dia atual
  - Ordem de prioridade drag-and-drop
  - Estimativa de tempo total do dia (soma dos limites de tempo)
  - Indicador visual de carga (vermelho se acima de 8h, verde se saudável)

- **Campo `scheduled_date`** na tabela `tasks`:
  ```sql
  ALTER TABLE tasks ADD COLUMN scheduled_date DATE;
  ```

- **"Programar para hoje"** ação rápida no menu de contexto da tarefa

- **Visão de agenda semanal** (7 dias com tarefas distribuídas)

---

### 2.2 — Tarefas Recorrentes

**Motivação:**
Muitas ações do GTD são hábitos e rotinas (revisão semanal, backup, reunião de equipe). Sem recorrência, o usuário recria manualmente essas tarefas.

**O que implementar:**

- **Campo `recurrence_rule`** na tabela tasks (formato iCal RRULE ou JSON simples):
  - Diário, semanal (dia da semana), mensal, personalizado

- **Motor de recorrência** no processo principal:
  - Ao concluir uma tarefa recorrente, criar automaticamente a próxima instância
  - Calcular `scheduled_date` da próxima ocorrência

- **UI de configuração** de recorrência no TaskDialog:
  - Dropdown: Não repete / Diariamente / Semanalmente / Mensalmente / Personalizado

---

### 2.3 — Subtarefas e Hierarquia

**Motivação:**
Projetos complexos requerem decomposição. Subtarefas permitem quebrar uma entrega em passos executáveis.

**O que implementar:**

- **Campo `parent_task_id`** na tabela tasks (auto-referência):
  ```sql
  ALTER TABLE tasks ADD COLUMN parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE;
  ```

- **UI de subtarefas** no SingleTaskPage:
  - Lista de subtarefas com checkbox rápido
  - Criar nova subtarefa inline
  - Progresso da tarefa pai baseado nas subtarefas (ex: 3/5 concluídas)

- **Limite de hierarquia:** 2 níveis (tarefa → subtarefa), sem aninhamento infinito

---

### 2.4 — Dependências entre Tarefas

**Motivação:**
Certas tarefas só podem iniciar após outras. O GTD chama isso de sequenciamento de projetos.

**O que implementar:**

- **Tabela `task_dependencies`:**
  ```sql
  CREATE TABLE task_dependencies (
    task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on_task_id)
  );
  ```

- **Indicador visual** de bloqueio (ícone de cadeado na TaskCard)
- **Filtro "bloqueadas"** no TaskListPage
- **Desbloqueio automático:** Quando a dependência é concluída, notificar o usuário

---

### 2.5 — Datas de Entrega e Alertas

**O que implementar:**

- **Campo `due_date`** na tabela tasks (já pode existir; se não, adicionar):
  ```sql
  ALTER TABLE tasks ADD COLUMN due_date DATETIME;
  ```

- **Indicadores visuais de prazo** na TaskCard:
  - Verde: mais de 3 dias
  - Amarelo: 1-3 dias
  - Vermelho: hoje ou atrasado

- **Notificações de prazo** (sistema Electron):
  - 1 dia antes do prazo
  - No dia do prazo (9h da manhã, configurável)

- **Ordenação por prazo** no TaskListPage

---

## FASE 3 — Processamento Inteligente (v3.2)
> **Objetivo:** Usar IA e automação para reduzir fricção e melhorar decisões.

---

### 3.1 — Processamento Guiado do Inbox

**O que é no GTD:**
Cada item do Inbox passa por uma série de perguntas:
*É acionável? → Sim → Leva menos de 2 min? → Sim → Faça agora. Não → Próximas/Aguardando/Projetos.*
*Não é acionável? → Referência / Someday / Lixo.*

**O que implementar:**

- **Modo de Processamento** (botão "Processar Inbox"):
  - Abre cada tarefa do Inbox em sequência
  - Fluxo de decisão visual com botões:
    - "É acionável?" → [Sim] [Não]
    - "Leva menos de 2 minutos?" → [Sim - Fazer agora] [Não]
    - "Você vai fazer?" → [Próximas] [Aguardando alguém] [Someday] [Referência] [Deletar]
  - Progresso: "3 de 12 itens processados"
  - Ao final: "Inbox zerado!" com confetes

---

### 3.2 — Sugestão Inteligente de Próxima Ação (IA)

**O que implementar:**

- **Integração com Claude API (Anthropic)** via `@anthropic-ai/sdk`:
  - Enviar contexto: tarefas disponíveis, contexto atual, hora do dia, energia
  - Receber sugestão de qual tarefa executar agora e por quê

- **Widget "O que fazer agora?"** no TodayPage ou Dashboard:
  - Botão "Sugerir próxima ação"
  - Mostra a tarefa sugerida com justificativa
  - Aceitar / Ignorar / Pedir nova sugestão

- **Configuração:** API key da Anthropic na SettingsPage

> **Nota técnica:** Usar o skill `claude-api` para implementar esta integração.

---

### 3.3 — Captura via Voz (Speech-to-Text)

**O que implementar:**

- **Botão de microfone** na janela de captura rápida
- **Web Speech API** (disponível no Electron via Chromium)
- Transcrição automática para o campo de texto
- Confirmação antes de salvar

---

### 3.4 — Importação de Tarefas

**O que implementar:**

- **Importação via texto** (uma tarefa por linha → todas vão para Inbox)
- **Importação CSV** com mapeamento de colunas
- **Importação de e-mail** (futuro — via plugin)
- **Importação do Todoist/Things/OmniFocus** (exportação JSON/CSV)

---

## FASE 4 — Visualizações e Análise (v3.3)
> **Objetivo:** Dar ao usuário clareza sobre seu trabalho e seus padrões.

---

### 4.1 — Visão de Horizonte GTD

**O que é no GTD:**
David Allen define 6 horizontes de perspectiva:
- H0: Próximas Ações (calendário e lista)
- H1: Projetos em andamento
- H2: Áreas de foco e responsabilidade
- H3: Metas e objetivos (1-2 anos)
- H4: Visão (3-5 anos)
- H5: Propósito e princípios

**O que implementar:**

- **Entidade `Area`** (Área de Foco):
  - `id`, `name`, `description`, `icon`
  - Projetos pertencem a áreas

- **Entidade `Goal`** (Objetivos):
  - `id`, `name`, `description`, `horizon` (1-5), `area_id`

- **HorizonsPage** — visão em camadas:
  - Horizonte 0: tarefas do dia (lista)
  - Horizonte 1: projetos ativos (cards)
  - Horizonte 2: áreas de foco (lista)
  - Horizonte 3-5: objetivos e visão (texto/markdown)

---

### 4.2 — Dashboard Avançado

**O que ampliar no DashboardPage:**

- **Métricas GTD-específicas:**
  - Taxa de conclusão do Inbox (% processado por semana)
  - Tempo médio de processamento de tarefas
  - Projetos sem ação há mais de 7 dias (alerta)
  - Tarefas em "Aguardando" há mais de 14 dias

- **Gráfico de fluxo de tarefas:**
  - Sankey ou Funnel mostrando fluxo Inbox → Próximas → Executando → Concluída

- **Relatório de produtividade semanal:**
  - PDF gerado com resumo da semana
  - Integração com revisão semanal

- **Energy Tracking:**
  - Campo de nível de energia ao iniciar tarefa (Alto/Médio/Baixo)
  - Análise de quais tipos de tarefa consomem mais energia

---

### 4.3 — Visão de Calendário

**O que implementar:**

- **CalendarPage** nova página:
  - Visão semanal e mensal
  - Tarefas com `scheduled_date` aparecem nos dias correspondentes
  - Tarefas com `due_date` marcadas com prazo
  - Arrastar e soltar para reprogramar

- **Bloqueio de tempo (Time Blocking):**
  - Alocar blocos de tempo para tarefas específicas
  - Visualização estilo Google Calendar
  - Integração com o timer (iniciar timer do bloco)

---

### 4.4 — Mapa Mental de Projetos

**O que implementar:**

- **Visão de mind map** para projetos complexos:
  - Biblioteca `react-flow` ou similar
  - Projeto como nó raiz
  - Subtarefas como nós filhos
  - Dependências como arestas
  - Estados visuais por cor

---

## FASE 5 — Integrações e Ecossistema (v3.4)
> **Objetivo:** Tornar o TickTask o centro do sistema pessoal de produtividade.

---

### 5.1 — Melhoria da Integração com Notion

**O que melhorar:**

- **Sincronização bidirecional real:**
  - Detectar mudanças no Notion e trazer para o SQLite local
  - Polling ou webhook (se suportado pelo Notion)
  - Resolução de conflitos (local vence / Notion vence / manual)

- **Sincronização de Projetos** (não só tarefas)

- **Importação inicial do Notion:**
  - Botão "Importar do Notion" — trazer tarefas existentes

- **Mapeamento de propriedades personalizado:**
  - Usuário mapeia colunas do Notion para campos do TickTask

---

### 5.2 — Integração com Google Calendar / Outlook

**O que implementar:**

- **OAuth com Google/Microsoft** (via Electron shell + callback local)
- **Exportar tarefas com prazo** como eventos de calendário
- **Importar compromissos** do calendário (para contexto na revisão)
- **Blocos de tempo** sincronizados bidirecionalmente

---

### 5.3 — Integração com GitHub/GitLab

**Para desenvolvedores:**

- **Criar tarefa a partir de issue** (GitHub Issue → Inbox)
- **Atualizar issue quando tarefa for concluída**
- **Vincular PR a tarefa** (campo `external_url`)
- **Webhooks** para captura automática de issues atribuídas

---

### 5.4 — Integração com Slack

**O que implementar:**

- **Bot Slack** que captura mensagens marcadas com emoji (ex: ✅) como tarefas
- **Comando `/ticktask add [tarefa]`** no Slack → vai para Inbox
- **Notificações de prazo** via DM no Slack

---

### 5.5 — API REST Local

**Para integrações avançadas:**

- **HTTP server local** (Express/Hono no processo principal):
  - `GET /tasks` — listar tarefas
  - `POST /tasks` — criar tarefa (captura externa)
  - `POST /timer/start/:id` — iniciar timer remotamente

- **Uso possível:** Alfred, Raycast, scripts de shell, automações com `curl`

---

## FASE 6 — UX e Qualidade de Vida (v3.5)
> **Objetivo:** Polir a experiência para uso diário intenso.

---

### 6.1 — Atalhos de Teclado

**O que implementar:**

- **Sistema completo de keybindings:**
  - `N` — Nova tarefa
  - `I` — Ir para Inbox
  - `T` — Ir para Hoje
  - `P` — Ir para Próximas
  - `R` — Iniciar revisão semanal
  - `Space` — Iniciar/Pausar timer na tarefa selecionada
  - `Ctrl+K` — Command palette (busca global)
  - `?` — Mostrar todos os atalhos

- **Command Palette** (estilo VS Code):
  - Busca unificada: tarefas, projetos, contextos, ações
  - Ações rápidas sem mouse

---

### 6.2 — Temas e Personalização

**O que implementar:**

- **Tema escuro/claro** (já pode ter parcialmente — solidificar)
- **Tema personalizado:** cor de destaque configurável
- **Densidade da UI:** Compacto / Normal / Espaçoso
- **Fonte configurável** (inter, mono, serif)

---

### 6.3 — Onboarding para GTD

**Para novos usuários:**

- **Tour interativo** na primeira abertura:
  - O que é GTD em 5 slides
  - Como funciona o fluxo Inbox → Processamento → Execução
  - Criar a primeira tarefa guiado
  - Configurar a revisão semanal

- **Templates de tarefas** pré-definidos:
  - Template de projeto pessoal
  - Template de reunião
  - Template de revisão semanal

---

### 6.4 — Melhorias no Timer

**O que implementar:**

- **Técnica Pomodoro integrada:**
  - 25 min trabalho / 5 min pausa (configurável)
  - Contagem regressiva visual
  - Notificação sonora ao fim do pomodoro
  - Contagem de pomodoros concluídos por tarefa

- **Estimativa de tempo vs real:**
  - Campo "Estimativa" (além do limite de tempo)
  - Gráfico de precisão de estimativas ao longo do tempo

- **Relatório de tempo detalhado:**
  - Por dia, semana, mês
  - Por projeto, contexto, tag

---

### 6.5 — Backup e Exportação

**O que implementar:**

- **Backup automático** do SQLite:
  - Cópia diária no `userData/backups/`
  - Retenção de 30 dias
  - Restaurar backup via SettingsPage

- **Exportação:**
  - JSON (todos os dados)
  - CSV (tarefas)
  - Markdown (relatório de projeto)
  - PDF (relatório semanal)

---

## Prioridades e cronograma sugerido

```
v3.0 — Fundação GTD
├─ 1.1 Projetos                    ████████████ 3 semanas
├─ 1.2 Someday/Maybe               ████ 1 semana
├─ 1.3 Contextos                   ████████ 2 semanas
├─ 1.4 Captura Rápida Global       ████████ 2 semanas
└─ 1.5 Revisão Semanal             ████████████ 3 semanas

v3.1 — Produtividade Avançada
├─ 2.1 Planejamento Diário         ████████ 2 semanas
├─ 2.2 Tarefas Recorrentes         ████████████ 3 semanas
├─ 2.3 Subtarefas                  ████████ 2 semanas
├─ 2.4 Dependências                ████████ 2 semanas
└─ 2.5 Datas e Alertas             ████ 1 semana

v3.2 — Processamento Inteligente
├─ 3.1 Processamento Guiado        ████████████ 3 semanas
├─ 3.2 Sugestão por IA             ████████████████ 4 semanas
├─ 3.3 Captura por Voz             ████████ 2 semanas
└─ 3.4 Importação                  ████████ 2 semanas

v3.3 — Visualizações
├─ 4.1 Horizonte GTD               ████████████████ 4 semanas
├─ 4.2 Dashboard Avançado          ████████████ 3 semanas
├─ 4.3 Calendário                  ████████████████████ 5 semanas
└─ 4.4 Mapa Mental                 ████████████ 3 semanas

v3.4 — Integrações
├─ 5.1 Melhoria Notion             ████████████ 3 semanas
├─ 5.2 Google Calendar             ████████████████ 4 semanas
├─ 5.3 GitHub/GitLab               ████████████ 3 semanas
├─ 5.4 Slack                       ████████████ 3 semanas
└─ 5.5 API REST Local              ████████ 2 semanas

v3.5 — UX e Qualidade
├─ 6.1 Atalhos de Teclado          ████████ 2 semanas
├─ 6.2 Temas                       ████ 1 semana
├─ 6.3 Onboarding GTD              ████████████ 3 semanas
├─ 6.4 Pomodoro + Timer            ████████████ 3 semanas
└─ 6.5 Backup e Exportação         ████████ 2 semanas
```

---

## Migração de banco de dados

Todas as alterações de schema devem usar um sistema de migrations versionadas. Recomenda-se adotar `better-sqlite3-migrations` ou implementar um sistema próprio em `src/main/database.ts`:

```typescript
const MIGRATIONS = [
  { version: 1, sql: '...' }, // schema original
  { version: 2, sql: 'ALTER TABLE tasks ADD COLUMN project_id INTEGER...' },
  { version: 3, sql: 'CREATE TABLE projects (...)' },
  // ...
]
```

---

## Princípios de desenvolvimento

1. **Local-first sempre:** Toda feature funciona offline. Integrações são opcionais.
2. **GTD-fiel:** Cada feature deve mapear para um conceito do GTD, sem distorções.
3. **Sem fricção na captura:** A captura de uma ideia deve ter 0 cliques desnecessários.
4. **Migrations reversíveis:** Todo ALTER TABLE deve ter rollback planejado.
5. **Performance:** O banco SQLite não deve degradar com 10.000+ tarefas.
6. **Acessibilidade:** Todas as ações críticas devem ser acessíveis via teclado.

---

## Referências GTD

- David Allen, *Getting Things Done* (2001, rev. 2015)
- [GTD Workflow Map](https://gettingthingsdone.com/resources/workflow-map/)
- Horizontes de Perspectiva: Ações → Projetos → Áreas → Metas → Visão → Propósito
