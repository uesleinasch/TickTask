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

| Região             | Componente                   | Comportamento                                                                              |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------------------------ |
| Coluna de cadernos | `notebooks/NotebookList.tsx` | Clique abre; alça `⠿` reordena (`SortableGroups`); lápis/lixeira no hover                  |
| Abas de seção      | `notebooks/SectionTabs.tsx`  | Borda superior na cor da seção; arrastar reordena; lápis/lixeira só na aba ativa; `+` cria |
| Lista de páginas   | `notebooks/PageList.tsx`     | Árvore achatada com recuo de 16px por nível; ações no hover                                |
| Editor             | `notebooks/PageEditor.tsx`   | Título (autosave 500 ms), datas, `NotesPanel` com dono `{ kind: 'page' }`                  |

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

| Chave                                                | Conteúdo                                            |
| ---------------------------------------------------- | --------------------------------------------------- |
| `ticktask.notebooks.notebook` / `.section` / `.page` | Última seleção. Se o id sumiu, cai no primeiro item |
| `ticktask.notebooks.tab`                             | Aba Notas/Desenho                                   |
| `ticktask.notesZenWidth`                             | Largura do Zen, compartilhada com a task            |

## Dados

- Canais `notebook:*`, `section:*`, `page:*` (`src/main/notebookIpc.ts`). Toda mutação de estrutura
  emite `notebooks:refresh`; o hook `useNotebooks` recarrega com esse evento, não por conta própria.
- Salvar notas/desenho não emite refresh (a lista não mostra nada que mude com isso).
- Imagens coladas vão para `note_assets` com `page_id`; o PNG do desenho para
  `userData/drawings/pages/<pageId>.png`.
- Excluir é definitivo, com `DeleteConfirmDialog`. Apaga os PNGs dos desenhos das páginas atingidas.

## Notion

Hierarquia de páginas sob uma raiz **Cadernos TickTask** (📚), criada dentro da página configurada
no Notion (ou na primeira acessível). Abaixo dela: caderno (📓) → seção (📑) → página (📄), com as
subpáginas aninhadas. O id da raiz fica em `notion-config.json` (`notebooksRootPageId`); se sumir
de lá, a raiz é procurada pelo título antes de criar outra.

- **Automático** (com o auto-sync do Notion ligado): criar, renomear, salvar notas/desenho/título e
  mover agendam o sync do item com 3 s de debounce. Excluir arquiva a página no Notion (arquivar o
  caderno arquiva tudo abaixo).
- **Manual**: botão **Sincronizar com o Notion** na aba Notas da página, e o ícone `RefreshCw` no
  hover do caderno, que sobe o caderno inteiro (seções e páginas). Funciona com o auto-sync
  desligado, desde que a API key esteja configurada.
- O corpo da página é reescrito a cada sync (notas + PNG do desenho no fim), preservando os blocos
  de subpágina.
- Avisos pelos mesmos eventos `notion:sync*` das tasks.

Limitações:

- A API não move página entre pais: mover no TickTask arquiva a página no Notion e cria outra no
  lugar novo (com as subpáginas). Links antigos para ela deixam de valer.
- A ordem das páginas no Notion é a de criação; reordenar no TickTask não reflete lá.
- Numa página com subpáginas, o corpo fica abaixo dos links das subpáginas.
- Com o auto-sync desligado, excluir não arquiva nada no Notion.

## Busca e menções

- **Busca** no cabeçalho (`notebooks/PageSearch.tsx`): procura em todos os cadernos, pelo título e
  pelo texto das notas, com debounce de 250 ms. Até 30 resultados, título que bate primeiro, com
  caderno › seção e um trecho. Setas + Enter escolhem; Esc fecha.
- O texto vem da coluna `notebook_pages.search_text`, derivada do JSON a cada save
  (`notesPlainText.ts`). Páginas criadas antes da coluna são preenchidas na migração.
- **Menção `@`**: o `@` das notas (de task ou de página) sugere páginas também. Clicar no chip abre
  `/notebooks?page=<id>`; a tela localiza caderno e seção (`page:locate`), salva a página aberta e
  troca a seleção.

## Exportar

- **Página**: botão **Exportar** na aba Notas → diálogo de salvar `.md`. Frontmatter (título,
  caderno, seção, datas), as notas em Markdown e o desenho no fim; imagens e o `.excalidraw` vão
  para `assets/` ao lado do arquivo.
- **Caderno**: ícone `Download` no hover → escolher uma pasta. Cria `<caderno>/` com uma pasta por
  seção, um `.md` por página e as subpáginas numa pasta com o nome da página mãe; imagens de todas
  as páginas num `assets/` comum. Nomes repetidos ganham " (2)". Regras em `notebookExportPlan.ts`.

## MCP

`list_notebooks`, `search_pages`, `read_page`, `create_page`, `write_page` e `delete_page` (ver
[`docs/mcp-server.md`](../mcp-server.md)). Escritas pelo MCP também recarregam a tela e agendam o
sync com o Notion.
