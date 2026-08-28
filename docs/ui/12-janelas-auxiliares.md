# Janelas auxiliares

Duas janelas sem moldura e um ícone de bandeja. As duas janelas carregam **o mesmo bundle do
renderer** que a janela principal, diferenciando-se pelo hash da URL — o que significa que qualquer
efeito colateral executado no escopo de módulo roda três vezes.

---

# Timer flutuante — `/float`

`src/renderer/src/pages/FloatTimerPage.tsx` · janela criada em `src/main/index.ts`

## Função

Manter os cronômetros visíveis e controláveis quando a janela principal está minimizada ou escondida.

## Quando aparece

Decidido no processo principal, não pelo renderer:

| Evento na janela principal | Efeito |
| --- | --- |
| **Minimizar** | mostra o float **se houver timer rodando** |
| **Fechar** (que na verdade esconde) | idem |
| **Restaurar** | esconde o float |
| **Focar** | esconde o float |

Sem nenhum timer ativo, o float nunca aparece.

## Geometria

| Propriedade | Valor |
| --- | --- |
| Largura | **300px** fixa |
| Altura | `linhas × 44 + 44 (rodapé) + 16 (respiro)`, com no mínimo 1 e **no máximo 5** linhas |
| Posição inicial | canto superior direito da área útil, com 20px de margem |
| Janela | sem moldura, transparente, sempre no topo, fora da barra de tarefas, não redimensionável, arrastável, sem sombra |

Acima de 5 timers a lista rola dentro da altura máxima. A janela só é redimensionada quando o número
de linhas muda — redimensionar a cada tique repintaria a janela transparente sem necessidade.

## Aparência

Fundo `bg-slate-900/95` com `backdrop-blur`, borda `slate-700`, `rounded-sm`. O `<body>` recebe a
classe `float-window`, que zera o fundo para deixar a transparência funcionar.

A janela inteira é área de arraste (`WebkitAppRegion: drag`, `cursor: grab`); os botões marcam
`no-drag` individualmente.

### Linha de timer (44px)

```
[◉] Nome da tarefa            00:12:45   [■]
```

- `Activity` esmeralda com um ponto pulsante sobreposto;
- nome truncado em `text-xs text-slate-300`;
- tempo em `font-mono text-sm font-bold tabular-nums`, branco;
- botão quadrado de **parar** (`Square` preenchido), vermelho.

### Rodapé (44px)

- esquerda: `N ativo` / `N ativos`;
- direita: **Parar todos** (`StopCircle`, vermelho) e um botão-ícone **Abrir app** (`Maximize2`).

### Estado de espera

Se a janela existir mas ainda não recebeu dados: fundo escuro com "Aguardando..." em
`text-slate-400`.

## Comunicação

O float **não consulta o banco**. Ele apenas escuta dois eventos vindos do processo principal:

- `float:update` — lista `{ taskId, taskName, seconds }`, emitida a cada tique pelo `timerStore` da
  janela principal;
- `float:clear` — limpa a lista.

E emite três comandos: `float:restore`, `float:stopTimer`, `float:stopAll`.

Consequência: se a janela principal for fechada de fato (não escondida), o float congela.

---

# Captura rápida — `/quick-capture`

`src/renderer/src/pages/QuickCapturePage.tsx`

## Função

Capturar um pensamento para o Inbox em poucos segundos, sem trocar de aplicativo — o gesto que
sustenta o "mind like water" do GTD.

## Como abre

- **Atalho global `Ctrl/Cmd + Shift + Space`**, registrado no sistema inteiro;
- item **"Captura rápida"** no menu da bandeja.

## Geometria

400×140, centrada horizontalmente e posicionada a 1/3 da altura da tela. Sem moldura, transparente,
sempre no topo, fora da barra de tarefas. **Fecha automaticamente ao perder o foco.**

## Aparência

Cartão branco `rounded-2xl shadow-2xl` — o único `rounded-2xl` do app, em contraste com o
`rounded-sm` de todo o resto.

```
┌────────────────────────────────────────────┐
│ 📥 CAPTURA RÁPIDA                       ×  │
│                                            │
│ [O que precisa ser feito?      ] [Capturar]│
│                                            │
│      Enter para capturar | Esc para fechar │
└────────────────────────────────────────────┘
```

- **Cabeçalho:** `Inbox` + "CAPTURA RÁPIDA" em `text-xs font-semibold uppercase tracking-wider
  text-slate-500`; "×" à direita.
- **Campo:** `autoFocus` (com um `setTimeout` de 100ms para garantir o foco após a janela aparecer),
  placeholder "O que precisa ser feito?", `focus:ring-2 focus:ring-slate-900`.
- **Botão Capturar:** `bg-slate-900`, desabilitado com campo vazio.
- **Dica:** "Enter para capturar | Esc para fechar" em `text-[10px]`.

Toda a janela é arrastável; o cabeçalho e a área do campo marcam `no-drag`.

## Estado de sucesso

Após capturar, a janela inteira vira um retângulo `bg-emerald-600` com `Inbox` + **"Capturado para
Inbox!"** em branco, e **fecha sozinha após 1,5 segundo**.

## O que a captura cria

Uma tarefa apenas com o nome, status `inbox` e categoria padrão. Sem projeto, contexto, prazo ou
tag — o processamento fica para depois, como manda o método.

A criação emite `tasks:refresh`, então a lista de tarefas da janela principal se atualiza sozinha.

---

# Ícone de bandeja

`src/main/tray.ts`

Ícone de 32px com tooltip "TickTask App". Menu de contexto:

| Item | Ação |
| --- | --- |
| Abrir TickTask | restaura e foca a janela principal (e esconde o float) |
| Captura rápida | abre a janela de captura |
| — | separador |
| Sair | encerra o app de fato |

Clique simples no ícone equivale a "Abrir TickTask".

A bandeja é o que sustenta dois comportamentos que a interface principal não explica:

1. **Fechar a janela não encerra o app** — o único aviso está numa nota de rodapé em `/settings`.
2. **Com a inicialização automática ligada, o app sobe direto na bandeja**, sem abrir janela.
