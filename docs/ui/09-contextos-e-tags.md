# Contextos e Tags — `/contexts` e `/tags`

`src/renderer/src/pages/ContextsPage.tsx` · `src/renderer/src/pages/TagsPage.tsx`

Duas telas de taxonomia com estrutura quase idêntica: cabeçalho, faixa azul explicativa, grade de
cartões e diálogos. Estão documentadas juntas porque um redesenho provavelmente deveria unificá-las.

---

# Contextos — `/contexts`

## Função

Gerenciar os contextos GTD — *onde* ou *com o que* uma ação pode ser executada. Uma tarefa pode ter
vários; o filtro por contexto na lista de tarefas é o que torna o conceito útil.

Oito contextos são criados na primeira execução: `@computador` 💻, `@telefone` 📱, `@reunião` 👥,
`@email` 📧, `@leitura` 📖, `@compras` 🛒, `@casa` 🏠, `@escritório` 🏢.

## Cabeçalho

`← Voltar` · divisor · `MapPin` · "Contextos" · botão **Novo Contexto** (`bg-slate-900`).

## Faixa explicativa

`bg-blue-50 border-blue-200 rounded-sm p-4`, texto azul:

> **Contextos GTD** definem *onde* ou *com o que* uma ação pode ser executada. Filtre suas tarefas
> por contexto para ver o que fazer agora, dado seu ambiente atual.

## Grade de cartões

`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3`. Cada cartão:

```
┌─────────────────────────────────┐
│ ┌────┐                     ✎ 🗑 │   ← ações no hover
│ │ 💻 │  @computador             │
│ └────┘                          │
└─────────────────────────────────┘
```

- quadrado de 40px com o emoji, fundo na **cor do contexto a 12% de opacidade** (`{cor}20`);
- nome em `font-semibold text-slate-900`;
- editar (`Pencil`) e excluir (`Trash2`) em `opacity-0 group-hover:opacity-100`.

**O cartão não mostra quantas tarefas usam o contexto** — informação que a tela de tags exibe.

Estado vazio: `MapPin` num círculo cinza + "Nenhum contexto cadastrado." Sem botão de ação.

## Diálogo Novo / Editar Contexto

Descrição: "Contextos definem onde ou com o que uma ação pode ser executada."

| Campo | Controle |
| --- | --- |
| Nome * | `Input`, placeholder "Ex: @computador" |
| Ícone | 16 emojis em botões de 40px: 💻 📱 👥 📧 📖 🛒 🏠 🏢 🚗 🏋️ ☎️ 📝 🎯 💬 🔧 📋. Selecionado: `bg-slate-900 ring-2 ring-offset-2` |
| Cor | 12 círculos de 32px. Selecionado: `ring-2 ring-offset-2 scale-110` |
| **Preview** | Bloco `bg-slate-50` reproduzindo o cartão final: quadrado tingido + emoji + nome (ou "Nome do contexto") |

O preview ao vivo é exclusivo desta tela — nenhum outro diálogo do app tem um.

Excluir passa pelo `DeleteConfirmDialog` com o texto genérico (que fala em "deletar permanentemente a
tarefa" — ver [15-inconsistencias.md](15-inconsistencias.md)).

### Duas paletas de cor no mesmo app

`ContextsPage` define suas próprias `CONTEXT_COLORS` e `CONTEXT_ICONS` como constantes locais, em vez
de usar `DEFAULT_COLORS` de `lib/colors.ts`. Os doze valores são **os mesmos**, na mesma ordem — é
duplicação literal, não divergência.

---

# Tags — `/tags`

## Função

Higienizar a taxonomia livre. Tags nascem enquanto o usuário digita no `TagInput`, então variações de
grafia ("urgente", "Urgente", "urgentes") viram tags diferentes. Esta tela existe principalmente para
**mesclar**.

## Cabeçalho

`← Voltar` · divisor · `Tag` · "Tags" · botão **Nova Tag** (`bg-slate-900`).

## Faixa explicativa

Mesmo estilo azul dos contextos:

> Tags nascem enquanto você digita nas tarefas, então variações de grafia acabam virando tags
> diferentes. **Mesclar** move as tarefas de uma tag para outra e descarta a primeira.

## Grade de cartões

Mesma grade dos contextos. Cada cartão:

```
┌─────────────────────────────────┐
│ ● trabalho              ✎ ⇄ 🗑 │
│   em 14 tarefas                 │
└─────────────────────────────────┘
```

- bolinha de 12px na cor da tag;
- nome em `font-semibold truncate`;
- **contagem de uso** em `text-xs text-slate-500`: `não usada`, `em 1 tarefa` ou `em N tarefas`;
- três ações no hover: **editar** (`Pencil`), **mesclar** (`Merge`, desabilitado com menos de duas
  tags) e **excluir** (`Trash2`).

Estado vazio: `Tag` num círculo cinza + "Nenhuma tag cadastrada."

## Diálogo Nova / Editar Tag

| Campo | Controle |
| --- | --- |
| Nome | `Input` com `autoFocus`, placeholder "urgente" |
| Cor | `ColorPicker` (`DEFAULT_COLORS`, 12 cores). Padrão: `#6366f1` |

A descrição do diálogo muda conforme o modo: em edição, *"O novo nome vale para todas as tarefas que
já usam esta tag."*; em criação, *"Escolha um nome e uma cor."*

Erros de gravação (nome duplicado, por exemplo) chegam como toast vermelho com a mensagem do backend.

## Diálogo Mesclar

Título: `Mesclar "{nome da tag}"`. Descrição dinâmica:

> As **em 14 tarefas** passam para a tag escolhida, e **"trabalho"** deixa de existir.

Um único campo: `SearchableSelect` "Mesclar em", listando todas as outras tags no formato
`nome (em N tarefas)`. Botão **Mesclar** habilitado só com um destino escolhido.

Ao concluir, o toast informa quantas tarefas foram afetadas:
`Tags mescladas — 14 tarefas atualizadas`.

## Diálogo Excluir

Único lugar do app com **`DeleteConfirmDialog` de texto customizado**:

- título: `Excluir "{nome}"?`
- descrição com uso: *"A tag sai de 14 tarefas. As tarefas em si não são afetadas."*
- ou, sem uso: *"Esta tag não está em nenhuma tarefa."*

É o melhor padrão de confirmação do app e vale generalizar.

---

## Comparação direta

| Aspecto | Contextos | Tags |
| --- | --- | --- |
| Identidade visual | emoji + cor | só cor |
| Contagem de uso no cartão | ✗ | ✓ |
| Preview no diálogo | ✓ | ✗ |
| Mesclar | ✗ | ✓ |
| Confirmação de exclusão | genérica | contextualizada |
| Paleta de cores | constante local duplicada | `DEFAULT_COLORS` |
| Criação implícita ao digitar | ✗ (só nesta tela) | ✓ (via `TagInput`) |
| Rótulo no filtro da lista | "Contexto" | "Fonte / Tag" |

Nenhuma das duas telas permite **navegar do rótulo para as tarefas que o usam** — clicar num contexto
ou numa tag não filtra nada.
