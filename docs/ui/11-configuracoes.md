# Configurações — `/settings`

`src/renderer/src/pages/SettingsPage.tsx` (shell, ~170 linhas) + uma seção por arquivo em
`src/renderer/src/components/settings/`.

## Função

Preferências do app e as três integrações (Notion, Google Calendar, servidor MCP). Acessível só pelo
botão-ícone de engrenagem no `TitleBar`.

## Estrutura

```
┌──────────────────────────────────────────────────────────────┐
│ ← Voltar              ⚙ Configurações                        │
├──────────────┬───────────────────────────────────────────────┤
│ APLICATIVO   │  ┌─────────────────────────────────────────┐  │
│ ⚙ Geral      │  │ [ícone] Título  (pílula de estado)      │  │
│ ⓘ Sobre      │  │ descrição                               │  │
│ INTEGRAÇÕES  │  │ ─────────────────────────────────────── │  │
│ 📖 Notion  ● │  │ conteúdo da seção                       │  │
│ 📅 Google  ● │  │                                         │  │
│ 🖥 MCP     ● │  └─────────────────────────────────────────┘  │
└──────────────┴───────────────────────────────────────────────┘
```

- **Barra lateral** de 224px (`w-56`), branca, em dois grupos. O item ativo fica `bg-slate-900
  text-white`. Integrações levam um ponto de estado à direita: esmeralda (conectado / rodando),
  slate-300 (desligado / não configurado), vermelho (MCP ligado mas falhou ao iniciar); o rótulo
  completo vai no `title`.
- A seção aberta persiste em `localStorage` (`settings.section`, via `usePersistedState`).
- **Painel**: `max-w-2xl`, um único cartão branco `rounded-sm` com a seção. Enquanto os estados
  carregam (`notionGetConfig`, `gcalGetStatus`, `mcpGetStatus`, `appGetAutostart` em paralelo), o
  painel mostra um `Loader2`; a barra lateral já aparece.
- A página é dona dos estados e os repassa às seções com um callback de mudança. Por isso o ponto
  na barra lateral muda no mesmo instante em que a seção conecta ou desliga algo.

## Peças compartilhadas (`components/settings/`)

| Peça | Papel |
| --- | --- |
| `SectionHeader` | quadrado `bg-slate-900` com ícone, título, `StatusPill` opcional, descrição e borda inferior |
| `ToggleRow` / `Switch` | linha `bg-slate-50` com rótulo, texto de estado e o switch (`role="switch"`) |
| `StatusPill` | pílula com ponto: esmeralda / slate / vermelho |
| `SetupSteps` | linha do tempo vertical de configuração (abaixo) |
| `OutLink`, `Callout` | link externo (`↗`, abre no navegador do sistema) e aviso âmbar/azul |
| `settingsStatus.ts` | puro e testado: estado de cada integração, tipo `NotionConfig`, `errorMessage` (tira o prefixo `Error invoking remote method…`) |

### `SetupSteps`

Lista numerada vertical. Cada passo é **manual** (você marca "Marcar como feito"; os ids ficam no
`localStorage` sob a chave da seção) ou **automático** (`autoDone`, derivado do estado real — ex.:
credenciais salvas, conta conectada). O **primeiro passo não feito** é o atual (número em
`bg-slate-900`); feitos ficam com check esmeralda e recolhidos, e o título vira um botão para
reabrir. Lógica em `stepProgress.ts` (pura, testada).

## Seções

### Geral

- `ToggleRow` **Iniciar o TickTask com o sistema** (texto muda com o estado). Se o sistema recusar,
  toast vermelho.
- Bloco "Fechar a janela não encerra o app" — explica a bandeja e o "Sair".
- Bloco "Captura rápida" com o atalho em `<kbd>` (`Ctrl` ou `⌘` conforme a plataforma) — só
  informativo, não editável.

### Notion

- **Sem banco criado** → `SetupSteps` (`settings.notion.steps`):
  1. Criar a integração (link para `notion.so/my-integrations`).
  2. API Key + **Testar conexão** (salva antes de testar). Automático: feito quando há chave salva e
     o teste passou ou o banco já existe.
  3. Conectar a integração a uma página (⋯ → Conexões → Adicionar conexões) + aviso de que ela só
     enxerga páginas conectadas.
  4. Page ID opcional + **Criar banco GTD APP**. Automático: feito quando há `databaseId`.
- **Com banco** → id do banco e última sincronização; `ToggleRow` de auto-sync (salva na hora);
  **Sincronizar todas as tarefas**; **Limpar configurações** (com confirmação — só apaga o
  `notion-config.json`, nada no Notion); e o recolhível "Ver guia de configuração e trocar a API
  Key" com os mesmos passos.
- Os antigos blocos azul/âmbar de ajuda no pé da página viraram o passo 3.

### Google Calendar

- **Não conectado** → `SetupSteps` (`settings.gcal.steps`) com o guia do Google Cloud embutido:
  1. Criar projeto · 2. Ativar a Calendar API · 3. Branding (com aviso: **não enviar logo**, exige
  verificação) · 4. Audience → Publish app (aviso: em Testing o acesso expira em 7 dias) ·
  5. Client "Desktop app" — os campos **Client ID** e **Client Secret** ficam dentro deste passo,
  com "Salvar credenciais" quando editados (automático: credenciais salvas) · 6. **Conectar com o
  Google** (automático: conectado), com a instrução Avançado → Acessar TickTask.
- **Conectado** → `ToggleRow` de auto-sync, **Ressincronizar todas**, **Desconectar** (a agenda
  "TickTask" continua no Google) e o recolhível "Ver guia de configuração e trocar credenciais".
- O secret nunca volta ao renderer: o campo mostra `•••••••• (salvo)`.

### Servidor MCP

- `ToggleRow` com o estado: "Desligado", `Rodando em 127.0.0.1:{porta}` (esmeralda) ou falha na
  porta (vermelho).
- Comando de registro num `<pre>` escuro + copiar; nota de que ele contém o token.
- **Regenerar token** pede confirmação (`DeleteConfirmDialog` com `confirmLabel="Regenerar"`)
  explicando que clientes registrados param de funcionar.

### Sobre

Versões em lista: TickTask (`app:getVersion`), Electron, Chromium e Node
(`window.electron.process.versions`).

## O que falta

- Nenhuma preferência de **aparência** (tema claro/escuro, densidade, fonte) — apesar de o CSS já
  definir a paleta `.dark` completa.
- Nenhuma configuração de **comportamento**: jornada de trabalho (fixa em 8h no plano do dia),
  limiares de time leak (1h/30min/0), janela da grade do calendário (07:00–22:00), intervalo do
  auto-sync de notas (60s), atalho global (fixo).
- Nenhuma gestão de **dados**: exportar/importar o banco, localizar o arquivo, fazer backup.
