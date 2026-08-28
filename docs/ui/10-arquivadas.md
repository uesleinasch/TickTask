# Arquivadas — `/archived`

`src/renderer/src/pages/ArchivedTasksPage.tsx` — a menor tela do app (~110 linhas).

## Função

Consultar tarefas arquivadas, restaurá-las ou apagá-las de vez. Arquivar (`is_archived = 1`) é
diferente de finalizar (`status = 'finalizada'`): uma tarefa pode ser arquivada em qualquer status,
e some de todas as outras listagens.

O título na tela é **"Arquivo Morto"**, enquanto o botão que leva até aqui diz **"Arquivadas"**.

## Cabeçalho

`← Voltar` para `/` · "Arquivo Morto" em `text-lg font-bold`. Sem ícone, sem divisor, sem ação
primária — é o único cabeçalho de sub-página nesse formato reduzido.

## Lista

`space-y-3` de cartões brancos com `opacity-75 hover:opacity-100` — a opacidade reduzida é o único
sinal visual de "isto está fora do fluxo".

Cada cartão, em duas colunas:

**Esquerda:**
- `StatusBadge` com o status que a tarefa tinha ao ser arquivada + data de criação em
  `text-xs text-slate-400` (formato local do sistema, não `pt-BR` explícito);
- nome em `font-medium text-slate-900`;
- `Tempo Final: HH:MM:SS` em `text-sm font-mono text-slate-500`.

**Direita:**
- botão **Desarquivar** (`Undo2`, contorno) — devolve a tarefa às listagens, com toast;
- botão-ícone **excluir** (`Trash2`, vermelho, ghost) — abre o `DeleteConfirmDialog`; a exclusão é
  definitiva.

## Estados

| Situação | Conteúdo |
| --- | --- |
| Carregando | "Carregando..." centralizado |
| Vazio | "Nenhuma tarefa arquivada." em `text-center text-slate-400 mt-20` — sem ícone, ao contrário de todos os outros estados vazios do app |

## Limitações

- **Nem card nem linha da tabela é clicável**: não há como abrir `/task/:id` a partir daqui. A única
  forma de rever os detalhes de uma tarefa arquivada é desarquivá-la primeiro.
- **Sem busca, filtro ou ordenação.** A consulta é simplesmente `{ archived: true }`.
- **Sem paginação nem carregamento incremental** — o `useIncrementalList` não é usado aqui.
- **Sem ações em massa.** Esvaziar o arquivo morto exige uma confirmação por tarefa.
- O cartão não mostra projeto, tags, contextos, prazo nem categoria — informações que estão no banco
  e apareceriam de graça se a tela reutilizasse `TaskCard` ou `TaskTable`.

Numa refatoração, esta tela é a candidata mais direta a virar apenas **um filtro da lista principal**
(`archived: true` já é um dos filtros aceitos por `listTasks`), em vez de uma rota própria com
componentes exclusivos.
