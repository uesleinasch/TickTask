Seguindo o plano de ação do roadmap para a aplicação implemente a 4.1 — Visão de Horizonte GTD

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

Critérios de Aceitação:
- [ ] Área de Foco e Objetivos criados e vinculados a projetos
- [ ] HorizonsPage implementada com camadas de perspectiva
- [ ] Dashboard com métricas GTD e gráficos de fluxo
- [ ] CalendarPage com visão semanal/mensal e time blocking
- [ ] Mapa mental funcional para projetos complexos

