# Cadernos

Rota `/notebooks` (`pages/NotebooksPage.tsx`). Anotações livres no molde do OneNote:
**Caderno → Seção → Página**, com até 2 níveis de subpágina. Cada página tem as mesmas abas
**Notas** (Tiptap) e **Desenho** (Excalidraw) do detalhe da tarefa. Decisões de modelo em
[`docs/adr/0001-cadernos.md`](../adr/0001-cadernos.md).

Entrada: botão **Cadernos** (`NotebookTabs`) no TitleBar, entre **Hoje** e **Revisão**. É
sub-página (sem `FloatingTimer`).

## Layout

```
┌ ← Voltar │ ▤ Cadernos ─────────────────────────────────────────────────────┐
├──────────────┬──────────────────────────────────────────────────────────────┤
│ CADERNOS     │ [Geral] [Reuniões] [+]                       ← SectionTabs   │
│ ⠿ ▤ Trabalho │────────────────┬─────────────────────────────────────────────│
│ ⠿ ▤ Pessoal  │ + Nova página  │ Título da página                            │
│              │ Página 1       │ criada 10/11/2026 14:02 · editada …         │
│              │   Subpágina    │ NOTAS  DESENHO                    [◎] [⤢]   │
│              │     Sub-sub    │                                             │
│ + Novo cad.  │ Página 2       │ (Tiptap ou Excalidraw)                      │
└──────────────┴────────────────┴─────────────────────────────────────────────┘
  NotebookList     PageList        PageEditor
```

| Região | Componente | Comportamento |
| --- | --- | --- |
| Coluna de cadernos | `notebooks/NotebookList.tsx` | Clique abre; alça `⠿` reordena (`SortableGroups`); lápis/lixeira no hover |
| Abas de seção | `notebooks/SectionTabs.tsx` | Borda superior na cor da seção; arrastar reordena; lápis/lixeira só na aba ativa; `+` cria |
| Lista de páginas | `notebooks/PageList.tsx` | Árvore achatada com recuo de 16px por nível; ações no hover |
| Editor | `notebooks/PageEditor.tsx` | Título (autosave 500 ms), datas, `NotesPanel` com dono `{ kind: 'page' }` |

Criar e renomear caderno/seção usa `NameColorDialog` (nome + `ColorPicker`). Caderno novo já vem
com a seção **Geral**.

## Páginas e subpáginas

Ações no hover de cada linha:

- **Nova subpágina** (`FilePlus2`) — só até o 2º nível.
- **Promover** (`IndentDecrease`) — sobe um nível, logo depois do pai.
- **Tornar subpágina da anterior** (`IndentIncrease`) — vira o último filho da irmã de cima; some
  quando passaria do limite.
- **Excluir** — leva as subpáginas junto.

Arrastar (a partir de 5px de movimento, para o clique continuar selecionando):

- Sobre outra **página**: vira irmã dela — antes, se subiu; depois, se desceu. A subárvore vai
  junto. Soltar dentro da própria subárvore é ignorado; passar do limite mostra um toast.
- Sobre uma **aba de seção**: move a página (e a subárvore) para o fim da raiz daquela seção. A aba
  ganha um anel enquanto a página está por cima.

As regras de árvore ficam em `src/shared/notebookTree.ts` (puro e testado), usado pelo renderer e
pelo main, que revalida tudo em `movePage`.

## Edição e troca de página

- Notas e desenho salvam com o mesmo debounce da task (400 ms e 800 ms).
- Antes de trocar de página, seção ou caderno, e no **Voltar**, a tela chama `flush()` do editor:
  título, notas e desenho pendentes são gravados antes de desmontar.
- O editor é montado com `key={pageId}`; trocar de página recria Tiptap/Excalidraw.
- **Maximizar** esconde cabeçalho, cadernos, abas e lista; **Zen** também, e centraliza o texto.
  Esc ou o botão redondo no canto voltam ao normal. Sem `NotesFocusBar` (não há timer de página).

## Preferências persistidas (`localStorage`)

| Chave | Conteúdo |
| --- | --- |
| `ticktask.notebooks.notebook` / `.section` / `.page` | Última seleção. Se o id sumiu, cai no primeiro item |
| `ticktask.notebooks.tab` | Aba Notas/Desenho |
| `ticktask.notesZenWidth` | Largura do Zen, compartilhada com a task |

## Dados

- Canais `notebook:*`, `section:*`, `page:*` (`src/main/notebookIpc.ts`). Toda mutação de estrutura
  emite `notebooks:refresh`; o hook `useNotebooks` recarrega com esse evento, não por conta própria.
- Salvar notas/desenho não emite refresh (a lista não mostra nada que mude com isso).
- Imagens coladas vão para `note_assets` com `page_id`; o PNG do desenho para
  `userData/drawings/pages/<pageId>.png`.
- Excluir é definitivo, com `DeleteConfirmDialog`. Apaga os PNGs dos desenhos das páginas atingidas.

## Ainda não

Sync com o Notion, busca, menção `@` de páginas, MCP e export local entram nas próximas entregas
(ver o ADR).
