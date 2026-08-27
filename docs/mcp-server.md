# Servidor MCP do TickTask

Servidor MCP embutido no processo main, exposto via HTTP em loopback (`127.0.0.1`) e autenticado
por token Bearer. Vive em `src/main/mcp/`: `config.ts` (shape/normalização da config), `store.ts`
(persistência em `userData/mcp-config.json`, 0600), `transport.ts` (HTTP + auth), `server.ts`
(registro das tools), `confirmGuard.ts` (guard de duas fases), `reply.ts`, `resolve.ts`,
`effects.ts`, e `tools/*.ts`.

## Ligar

Em **Ajustes → Servidor MCP**, ative o toggle. O app inicia um `http.Server` local na porta
configurada (padrão `39237`) e mostra o comando de registro pronto para copiar. É possível
regenerar o token a qualquer momento (reinicia o servidor).

## Registrar num cliente MCP

O registro recomendado é via **ponte stdio** (`src/mcp-bridge/`, comando pronto na tela de Ajustes):

```
claude mcp add ticktask --scope user --env ELECTRON_RUN_AS_NODE=1 -- "<executável>" "<userData>/mcp-bridge.js"
```

Dois detalhes importam nesse comando:

- **`--scope user`** — registra para todos os projetos. Com o escopo `local` (padrão), o servidor
  vale só no diretório onde o comando rodou, e cada diretório novo exige repetir o registro e
  reiniciar o cliente.
- **stdio, não HTTP** — quem sobe o processo da ponte é o cliente MCP, então o servidor nunca
  entra em `failed` por o app estar fechado.

O HTTP em loopback continua disponível para clientes que preferirem falar direto com ele:

```
claude mcp add ticktask --scope user --transport http http://127.0.0.1:<porta>/mcp --header "Authorization: Bearer <token>"
```

A diferença prática: nesse modo o TickTask **precisa** estar aberto no momento em que a sessão do
cliente inicia, ou o servidor fica indisponível até a sessão ser reiniciada.

## Ponte stdio

`src/mcp-bridge/index.ts` é compilado para `out/main/mcp-bridge.js` (segundo entry do build do
main) e copiado para `userData/mcp-bridge.js` a cada boot — o caminho registrado no cliente precisa
sobreviver a atualizações do app e, no AppImage, ao volume temporário da instalação.

Por frame JSON-RPC lido do stdin, a ponte faz POST no servidor HTTP local. Em `ECONNREFUSED`, ela
abre o app com `--hidden` (bandeja, sem janela), aguarda a porta aceitar conexão (poll de 250 ms,
teto de 20 s) e reenvia. Como o servidor é stateless, o repasse é transparente: tool nova no app
aparece no cliente sem nada a espelhar na ponte.

A config (porta e token) é lida a cada frame, então regenerar o token em Ajustes passa a valer na
chamada seguinte, sem reiniciar o cliente. Todo caminho de falha — MCP desligado, config ausente,
token recusado, app que não abriu no tempo — responde um erro JSON-RPC legível em vez de encerrar
o processo, para o cliente seguir conectado.

Ao subir a ponte com `ELECTRON_RUN_AS_NODE=1`, essa variável é removida do ambiente antes do
`spawn` do app: herdada, faria o Electron subir como Node puro, sem janela e sem servidor.

## Tools

| Tool | Descrição |
| --- | --- |
| `server_info` | Confirma que o TickTask está aberto e respondendo. |
| `search_tasks` | Lista tasks com filtros (status, categoria, energia, projeto, contexto, busca, datas). Não inclui subtarefas. |
| `get_task` | Detalhe completo de uma task: campos, notas em Markdown, subtarefas, dependências, registros de tempo. |
| `create_task` | Cria uma task; projeto/contexto por nome ou id, tags criadas se não existirem. |
| `update_task` | Altera campos de uma task; passar `tags`/`contexts` substitui a lista inteira. |
| `bulk_update_tasks` | Altera status/projeto/arquivamento de várias tasks; acima do `bulkThreshold` exige `confirm_token`. |
| `delete_tasks` | Deleta tasks permanentemente, incluindo subtarefas em cascata; sempre exige `confirm_token`. |
| `organize_overview` | Retrato GTD: inbox, sem projeto, atrasadas, bloqueadas, someday, métricas. |
| `list_structure` | Projetos, contextos, tags (com uso), áreas e metas num só payload. |
| `manage_structure` | Cria/atualiza/remove projeto, contexto, tag, área ou meta; remover e mesclar tag exigem `confirm_token`. |
| `timer` | Inicia, para, consulta status ou lança tempo manual numa task. |
| `time_report` | Tempo gasto: geral, semanal, por task, ou registros de uma task. |
| `read_notes` | Devolve as notas de uma task convertidas para Markdown. |
| `write_notes` | Grava Markdown nas notas; `mode=append` (recomendado) ou `mode=replace` sobre nota não vazia, que exige `confirm_token`. |
| `agenda` | Tasks agendadas e blocos de tempo de um dia, semana ou mês. |
| `plan_day` | Agenda tasks numa data, ordena o dia, cria/remove blocos de tempo; acima do `bulkThreshold` exige `confirm_token`. |
| `weekly_review` | Lê revisões anteriores e indicadores de saúde, ou registra uma nova revisão. |

## Guard de confirmação

Operações destrutivas ou em massa seguem um fluxo de duas fases (`confirmGuard.ts`):

1. Primeira chamada sem `confirm_token` devolve `code: needs_confirmation`, um preview do que será
   afetado e um `confirm_token` (UUID, TTL de 5 minutos, uso único).
2. O agente mostra o preview ao usuário e repete a chamada com o mesmo `confirm_token`.
3. O token é validado contra um hash da operação exata (`kind` + payload) — não serve para uma
   operação diferente, mesmo que pareça similar, e é descartado no primeiro uso.

`delete_tasks`, `manage_structure` (delete/merge_tag) e `write_notes` (`mode=replace` sobre nota
não vazia) sempre exigem confirmação. `bulk_update_tasks` e `plan_day` só exigem acima do
`bulkThreshold` configurado (padrão 5 itens).

## Limitações conhecidas

- O servidor só responde enquanto o app TickTask está aberto (não há processo headless). Com a
  ponte stdio isso deixa de exigir ação sua — ela abre o app quando necessário —, mas a primeira
  chamada nesse caso paga o tempo de inicialização do app (~1–3 s).
- O app agora vive na bandeja: fechar a janela não encerra o processo, então o servidor continua
  de pé. Encerrar de verdade é pelo item "Sair" no ícone da bandeja.
- `search_tasks` não retorna subtarefas — use `get_task` para o detalhe de uma task específica.
- `write_notes` converte um subconjunto de Markdown; menções `@` a outras tasks, tabelas e imagens
  do editor Tiptap não sobrevivem à conversão.
- Deletar uma task pai apaga as subtarefas em cascata — não há como recuperar depois de confirmado.
