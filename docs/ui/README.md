# TickTask — Mapa da Interface

Documentação de referência da interface do TickTask (v3.8.2), escrita para servir de **contexto de
design**: cada tela, cada região, cada elemento interativo e o que ele faz.

Este conjunto descreve **o que existe hoje**, não o que deveria existir. É a linha de base sobre a
qual uma refatoração de interface pode ser desenhada sem perder funcionalidade.

## Como ler

| Documento | Conteúdo |
| --- | --- |
| [00-visao-geral.md](00-visao-geral.md) | O produto, o vocabulário GTD, o shell da aplicação, as janelas, as rotas e os padrões que se repetem em toda tela |
| [01-lista-de-tarefas.md](01-lista-de-tarefas.md) | Rota `/` — a tela inicial: abas de status, filtros, ações em massa, quatro modos de visualização |
| [02-detalhe-da-tarefa.md](02-detalhe-da-tarefa.md) | Rota `/task/:id` — a tela mais densa do app: painel de dados, timer herói, editor de notas e desenho |
| [03-plano-do-dia.md](03-plano-do-dia.md) | Rota `/today` — plano de hoje (arrastável) e visão da semana |
| [04-calendario.md](04-calendario.md) | Rota `/calendar` — grade semanal com blocos de tempo e calendário mensal com drag-and-drop |
| [05-projetos.md](05-projetos.md) | Rotas `/projects` e `/project/:id` |
| [06-horizontes.md](06-horizontes.md) | Rota `/horizons` — as 6 perspectivas GTD (H0–H5), áreas de foco e metas |
| [07-revisao-semanal.md](07-revisao-semanal.md) | Rota `/review` — checklist de revisão e indicadores de saúde do sistema |
| [08-dashboard.md](08-dashboard.md) | Rota `/dashboard` — métricas, gráficos e heatmap |
| [09-contextos-e-tags.md](09-contextos-e-tags.md) | Rotas `/contexts` e `/tags` — as duas telas de taxonomia |
| [10-arquivadas.md](10-arquivadas.md) | Rota `/archived` — o arquivo morto |
| [11-configuracoes.md](11-configuracoes.md) | Rota `/settings` — Notion, inicialização e servidor MCP |
| [12-janelas-auxiliares.md](12-janelas-auxiliares.md) | Timer flutuante, captura rápida e ícone de bandeja |
| [13-biblioteca-de-componentes.md](13-biblioteca-de-componentes.md) | Todo componente reutilizável, com props e comportamento |
| [14-design-tokens.md](14-design-tokens.md) | Cores, tipografia, raios, espaçamentos e animações realmente usados no código |
| [15-inconsistencias.md](15-inconsistencias.md) | Divergências, duplicações e pontos de atrito — insumo direto para a refatoração |

## Convenções destes documentos

- **Rota** é sempre o caminho do `HashRouter` (`#/task/42`).
- **Elemento** descreve algo que o usuário vê ou toca; entre parênteses vem o componente React que o
  produz, quando ajuda a localizar.
- Classes Tailwind aparecem só quando o valor concreto importa para o desenho (largura fixa,
  quebra de linha, cor semântica). O inventário completo de tokens está em
  [14-design-tokens.md](14-design-tokens.md).
- Chaves de `localStorage` estão citadas porque definem o que a interface "lembra" entre sessões —
  qualquer redesenho precisa decidir se mantém, migra ou descarta cada uma.

## Documentação técnica relacionada

- [`../mcp-server.md`](../mcp-server.md) — servidor MCP embutido (ferramentas, limitações)
- [`../../CLAUDE.md`](../../CLAUDE.md) — arquitetura, comandos, convenções de código
- [`../../ui-ux/TickTask - Design System & Guia de Estilo.md`](../../ui-ux/TickTask%20-%20Design%20System%20&%20Guia%20de%20Estilo.md) —
  guia de estilo original, **parcialmente defasado** (ver [15-inconsistencias.md](15-inconsistencias.md))
