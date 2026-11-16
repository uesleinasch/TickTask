# Terminal embutido

Painel de terminal no rodapé da janela principal, por task, no estilo do VS Code. Cada task pode
ter um **diretório de trabalho** (`tasks.working_dir`) e um **comando inicial**
(`tasks.start_command`); o terminal abre nessa pasta e digita o comando.

## Onde aparece

- **Detalhe da tarefa** — botão laranja **Terminal** ao lado de **Notas** e o campo
  **Diretório de trabalho** na coluna esquerda (ver [02-detalhe-da-tarefa.md](02-detalhe-da-tarefa.md)).
- **TitleBar** — botão laranja com o número de terminais abertos, em **todas** as rotas, só quando
  há pelo menos uma sessão. Alterna o painel.
- **Atalho** `Ctrl + '` (a tecla à esquerda do 1; no teclado US é `` Ctrl + ` ``). É local do
  renderer, não `globalShortcut`, e funciona mesmo com o foco dentro do terminal.
- **Configurações → Geral → Terminal** — shell (vazio = `$SHELL`, PowerShell no Windows) e o
  toggle **Iniciar o timer no primeiro comando**. Os dois ficam em `localStorage`
  (`terminal.shell`, `terminal.autoTimer`).

## Painel (`components/terminal/TerminalPanel.tsx`)

```
┌──────────────────────────────────────────────────────────────────────┐ ← alça (arrastar)
│ ▣  ● Deploy API ×   Front (1) ×   Front (2) ×   +    ↻ Reiniciar  ⤢  ⌄ │
├──────────────────────────────────────────────────────────────────────┤
│ ~/repo $ npm run dev                                                 │
│ ...                                                                  │
└──────────────────────────────────────────────────────────────────────┘
```

- Irmão de `<main>` em `App.tsx`; empurra o conteúdo para cima. Altura arrastável entre 120px e
  70% da janela, guardada em `terminal.height`.
- Uma aba por sessão, com o nome da task; várias da mesma task ganham `(n)`. **Duplo clique** no
  nome (ou botão direito → **Renomear**) troca o nome da aba: Enter salva, Esc cancela, vazio volta
  ao padrão; **Restaurar nome** no mesmo menu também. O nome vive na sessão, no main
  (`terminal:customize`, até 60 caracteres), sobrevive à navegação e ao **Reiniciar**, e morre com a
  sessão.
- No mesmo menu do botão direito, **Cor ▸** (a paleta `DEFAULT_COLORS`, ou "Sem cor") pinta uma
  linha de 2px embaixo da aba e o ícone; **Ícone ▸** põe um dos 12 ícones do catálogo
  `shared/terminalTab.ts` antes do nome. O main só aceita hex de 6 dígitos e ícone do catálogo
  (`normalizeTabColor`/`normalizeTabIcon`, testados); como o nome, os dois vivem na sessão. Ponto laranja =
  processo em foreground diferente do shell (consulta a cada 2s com o painel aberto). Riscada =
  processo encerrado; aí aparece **Reiniciar**.
- `+` abre outra sessão para a task da aba ativa. `×` encerra a sessão — pede confirmação se há
  processo rodando. Encerrar **não** desvincula o diretório da task.
- **Dividir** (`Columns2`, ao lado de tela cheia) cria uma sessão nova da task ativa e a mostra num
  segundo painel à direita; com o split aberto, o mesmo botão (`PanelRightClose`) ou o `×` do
  cabeçalho do painel direito **fecha a divisão** sem matar a sessão (ela continua como aba). Botão
  direito numa aba → **Abrir à direita** põe qualquer outra sessão no painel direito. As duas abas
  visíveis ficam destacadas; clicar numa aba troca o painel esquerdo. Com split, cada painel tem um
  cabeçalho fino com ícone, nome e **Reiniciar** (o da barra some). A divisória arrasta entre 20% e
  80%, guardada em `terminal.splitRatio`. Fechar a sessão da esquerda promove a da direita. Regras
  puras em `stores/terminalPanes.ts` (testadas).
- `⤢` (ou `Ctrl + Shift + '`) põe o terminal em **tela cheia**: cobre a janela inteira, inclusive
  a TitleBar (`fixed inset-0`). O mesmo botão (`⤡`) restaura. Esconder o painel sai da tela cheia.
- `⌄` (ou o atalho) esconde o painel sem matar nada. Só as abas visíveis (uma, ou duas com split) montam um xterm; ao voltar,
  ela reexibe os últimos ~200 KB de saída guardados no main.

## Comportamento que não aparece no JSX

- As sessões vivem no **main** (`src/main/terminal.ts` + `terminalSessions.ts`) e sobrevivem à
  navegação e ao fechar a janela (que só esconde para o tray). Morrem ao **Sair** do app e quando
  a task é apagada (inclusive pelo MCP).
- **Shift + Enter** envia `ESC + CR` (o "Alt+Enter" dos terminais) em vez do CR puro que o xterm
  manda nas duas teclas. Claude Code e outras TUIs entendem como nova linha sem enviar; no zsh é o
  `self-insert-unmeta` (quebra a linha no buffer). Regra pura em `terminalKeys.ts` (testada).
- O primeiro Enter de cada sessão inicia o timer da task se ele não estiver rodando e o toggle
  estiver ligado; o toast oferece **Parar**.
- Diretório que deixou de existir ou shell configurado inválido viram toast; o shell inválido cai
  no padrão do sistema.
