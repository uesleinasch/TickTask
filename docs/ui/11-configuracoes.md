# Configurações — `/settings`

`src/renderer/src/pages/SettingsPage.tsx` (~665 linhas)

## Função

Três integrações independentes numa página só: **Notion**, **inicialização com o sistema** e
**servidor MCP**. Não há nenhuma preferência de interface, idioma, tema ou comportamento do app.

Acessível apenas pelo botão-ícone de engrenagem no `TitleBar` (o primeiro da direita, `variant=ghost`,
sem rótulo).

## Cabeçalho

`← Voltar` · centro: `Settings` + "Configurações" · direita: um `<div class="w-20" />` vazio, usado
só para equilibrar o `justify-between`. Corpo em `max-w-2xl mx-auto` com `space-y-6`.

Enquanto carrega a configuração salva, a tela inteira é um `Loader2` girando.

---

## Seção 1 — Integração com Notion

Cabeçalho da seção: quadrado `bg-slate-900` com o logotipo do Notion em SVG inline + título e
subtítulo ("Sincronize suas tarefas com o banco de dados GTD APP no Notion").

### Elementos, na ordem

| Elemento | Quando aparece | Detalhe |
| --- | --- | --- |
| **Faixa de status da conexão** | após testar | verde com `Check` e "Conectado ao Notion com sucesso!" ou vermelha com `X` e "Falha na conexão. Verifique suas credenciais." |
| **API Key do Notion** | sempre | `input[type=password]`, placeholder `ntn_xxxxxxxxxxxx`, com link para `notion.so/my-integrations` abaixo |
| **Banco configurado** | com `databaseId` | faixa verde: `Database` + "Banco de dados GTD APP configurado:" + os 8 primeiros caracteres do id em `<code>` |
| **Página TickTask** | com `pageId` | faixa cinza equivalente |
| **Última sincronização** | com `lastSync` | linha em `text-xs text-slate-500`, data/hora `pt-BR` |
| **Sincronização Automática** | com `databaseId` | linha `bg-slate-50` com rótulo, explicação e **toggle** de 44×24px (esmeralda quando ligado). Salva imediatamente e emite toast |

### Botões de ação

- **Testar Conexão** (contorno, `Link2`) — salva a configuração antes de testar.
- **Criar Banco GTD APP** (`bg-slate-900`, `Database`) — só quando ainda **não** há `databaseId`;
  provisiona o banco no Notion e recarrega a configuração.
- **Sincronizar Todas as Tarefas** (`bg-emerald-600`, `RefreshCw`) — só quando **há** `databaseId`;
  o toast final informa `N sucesso, M falhas`.

Todos trocam o ícone por `Loader2` girando durante a operação.

### Configurações Avançadas

Bloco recolhível (`ChevronDown`/`ChevronUp`) com um único campo: **Page ID (opcional)**, com a nota
*"Se não informado, uma página 'TickTask' será criada automaticamente."*

### Rodapé da seção

**Limpar Configurações** (ghost vermelho, à esquerda) e **Salvar Alterações**
(`bg-blue-600`, à direita) — este só aparece quando há mudanças pendentes.

O botão de salvar é azul aqui, enquanto o resto da tela usa `bg-slate-900` e `bg-emerald-600`. Três
cores de ação primária numa página só.

---

## Seção 2 — Inicialização

Quadrado `bg-slate-900` com `Power` + título "Inicialização" e subtítulo "Mantenha o TickTask e o
servidor MCP disponíveis desde o login".

Uma linha `bg-slate-50` com toggle:

- **Iniciar o TickTask com o sistema**
- texto de estado que muda com o valor:
  - ligado: *"Ativado — o app sobe na bandeja, sem abrir janela"*
  - desligado: *"Desativado — o app só abre quando você mandar"*

Se o sistema recusar a alteração, um toast vermelho avisa: "Não foi possível alterar a inicialização
automática".

Abaixo, nota em `text-xs` com `AlertCircle`:

> Fechar a janela esconde o app na bandeja; para encerrar, use "Sair" no ícone da bandeja.

Essa é a **única explicação em toda a interface** de por que fechar a janela não fecha o app — e ela
vive escondida numa tela que o usuário talvez nunca abra.

---

## Seção 3 — Servidor MCP

Quadrado `bg-slate-900` com `Server` + título "Servidor MCP" e subtítulo "Exponha o TickTask para
assistentes como o Claude Code via MCP".

### Toggle do servidor

Linha `bg-slate-50` com o rótulo "Servidor MCP" e um texto de estado em três variantes:

| Estado | Texto | Cor |
| --- | --- | --- |
| Desligado | "Desligado" | `text-slate-500` |
| Ligado e rodando | `Rodando em 127.0.0.1:{porta}` | `text-emerald-600` |
| Ligado com falha | `Falha ao iniciar na porta {porta} — verifique se ela já está em uso` | `text-red-600` |

### Comando de registro

Rótulo "Comando para registrar no Claude Code". Bloco `<pre>` escuro (`bg-slate-900 text-slate-100`,
`whitespace-pre-wrap break-all`) com o comando completo — que **inclui o token de acesso em texto
plano** — e um botão de copiar (`Copy`) ao lado.

Nota abaixo: *"Rode esse comando no terminal do Claude Code para registrar o servidor."*

### Regenerar Token

Botão de contorno com `KeyRound`. Invalida o token atual — o comando exibido muda e qualquer cliente
já registrado precisa ser reconfigurado. **Não há confirmação nem aviso sobre essa consequência.**

---

## Blocos informativos finais

### "Como configurar a integração" (`bg-blue-50`)

Lista numerada de 5 passos com uma sub-lista aninhada, explicando como criar a integração no Notion e
— o ponto crítico, marcado com `IMPORTANTE` em negrito — como **conectar a integração a uma página**
pelo menu ⋯ → Conexões → Adicionar conexões.

### "⚠️ Atenção" (`bg-amber-50`)

Parágrafo explicando que a integração só enxerga páginas explicitamente conectadas, e que erros de
"página não encontrada" vêm daí.

Os dois blocos somam quase um terço da altura da página e repetem parte da informação. São
documentação inline num lugar onde um link ou um passo-a-passo progressivo resolveria melhor.

---

## O que falta

- Nenhuma preferência de **aparência** (tema claro/escuro, densidade, fonte) — apesar de o CSS já
  definir a paleta `.dark` completa.
- Nenhuma configuração de **comportamento**: jornada de trabalho (fixa em 8h no plano do dia),
  limiares de time leak (1h/30min/0), janela da grade do calendário (07:00–22:00), intervalo do
  auto-sync de notas (60s), atalho global (fixo em `Ctrl+Shift+Space`).
- Nenhuma gestão de **dados**: exportar/importar o banco, localizar o arquivo, fazer backup.
- Nenhuma informação de **versão** do app (existe um componente `Versions.tsx` no repositório, mas
  não é usado em lugar nenhum).
