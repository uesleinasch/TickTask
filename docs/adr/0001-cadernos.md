# ADR 0001 — Cadernos: Caderno → Seção → Página

- Status: aceito
- Data: 2026-11-16

## Contexto

O TickTask ganha uma tela de anotações livres no molde do OneNote. Cada página precisa das mesmas
abas da task — Notas (Tiptap) e Desenho (Excalidraw) — e, numa entrega seguinte, sincronizar com o
Notion. Até aqui editores, imagens coladas (`note_assets`), o PNG do desenho
(`drawings/<taskId>.png`) e o sync estavam todos amarrados a `taskId`.

## Decisões

### Modelo

Três tabelas novas, com `ON DELETE CASCADE` de cima para baixo:

| Tabela              | Campos próprios                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `notebooks`         | `name`, `color`, `position`, `notion_page_id`                                             |
| `notebook_sections` | `notebook_id`, `name`, `color`, `position`, `notion_page_id`                              |
| `notebook_pages`    | `section_id`, `parent_page_id`, `title`, `notes`, `drawing`, `position`, `notion_page_id` |

- Caderno e seção têm só cor (sem ícone), como no OneNote.
- Caderno novo nasce com uma seção ("Geral"); seção nova nasce vazia.
- `notes` (ProseMirror JSON) e `drawing` (Excalidraw JSON) ficam na própria página. Listagens de
  páginas não trazem essas colunas, como `TASK_LIST_COLUMNS` faz com as tasks.
- Ordem manual por `position` entre irmãos. Reordenar reescreve as posições `0..n` numa transação.

### Subpáginas

- `parent_page_id` aponta para outra página da mesma seção. O banco aceita qualquer profundidade;
  a regra de negócio limita a **2 níveis** (página → subpágina → sub-subpágina), como o OneNote.
- Mover uma página leva a subárvore inteira junto (inclusive para outra seção). O movimento é
  recusado se a subárvore passar do limite ou se o novo pai estiver dentro dela.
- A lista é exibida achatada em ordem de árvore, com recuo por nível.

### Exclusão

Definitiva, com diálogo de confirmação. Apagar caderno ou seção apaga tudo abaixo; apagar página
apaga suas subpáginas. Junto vão os PNGs dos desenhos. No Notion (entrega 2), excluir = arquivar a
página, que fica recuperável por lá.

### Dono de notas, imagens e desenho

Um dono tipado, `NotesOwner = { kind: 'task' | 'page'; id }`, substitui `taskId` em todo o caminho:

- `note_assets` ganha `page_id` (FK para `notebook_pages`, cascade) e `task_id` deixa de ser
  obrigatório; um `CHECK` exige exatamente um dos dois. A tabela é reconstruída uma vez (SQLite não
  altera `NOT NULL`/`CHECK` com `ALTER TABLE`), copiando as linhas existentes de task.
- PNG do desenho: task continua em `drawings/<taskId>.png`; página vai para
  `drawings/pages/<pageId>.png`. O backup já copia `drawings/` recursivamente.
- O protocolo `ticktask-asset://` não muda: a URL só carrega o `assetId`.
- No renderer, os editores recebem `owner` e um módulo (`notesOwner.ts`) decide qual canal IPC
  grava. A task usa os mesmos componentes de antes.

### Notion (entrega 2)

Hierarquia de páginas, não database: uma página-raiz "Cadernos TickTask" e, abaixo dela, uma página
por caderno, por seção e por página (com subpáginas aninhadas). Cada linha guarda seu
`notion_page_id`. O corpo reaproveita `notionBlocks.ts`, `notionFileUpload.ts` e o upload do PNG do
desenho.

O SDK do Notion (v4) não move página entre pais. Mover no TickTask arquiva a página antiga no Notion
e cria outra sob o pai novo; a ordem entre irmãs no Notion fica sendo a de criação.

### Vínculo com tasks (entrega 3)

Opcional, pela menção `@` que já existe nas notas: a busca de menções passa a sugerir páginas além
de tasks.

## Entregas

1. Modelo, dono genérico, editores desacoplados, IPC e a tela (cadernos funcionando local).
2. Sync com o Notion.
3. Busca e menção entre páginas e tasks; MCP e export local.

## Layout

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ CADERNOS     │ [Seção A] [Seção B] [Seção C] [+]                            │
│ ● Trabalho   ├────────────────┬─────────────────────────────────────────────┤
│ ● Pessoal    │ + Nova página  │ Título da página                            │
│ ● Estudos    │ Página 1       │ criada 10/11 · editada há 2 min             │
│              │   Subpágina    │ NOTAS  DESENHO                    [◎] [⤢]   │
│              │     Sub-sub    │                                             │
│ + Caderno    │ Página 2       │ (editor Tiptap ou Excalidraw)               │
└──────────────┴────────────────┴─────────────────────────────────────────────┘
```

## Consequências

- A migração de `note_assets` roda uma vez na subida do app; tasks existentes mantêm suas imagens.
- Toda função que grava notas, imagens ou desenho passa a receber o dono, não um `taskId`.
- Arrastar página para uma aba de seção move a página (e a subárvore) para a raiz daquela seção.
