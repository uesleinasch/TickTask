import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { ArrowLeft, Minimize2, NotebookTabs } from 'lucide-react'
import type { Notebook, NotebookPageSummary, NotebookSection } from '@shared/types'
import {
  canPlaceUnder,
  dropPlacement,
  flattenPageTree,
  indentPlacement,
  outdentPlacement,
  type PagePlacement
} from '@shared/notebookTree'
import { Button } from '@renderer/components/ui/button'
import { toast } from '@renderer/components/ui/sonner'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { NotebookList } from '@renderer/components/notebooks/NotebookList'
import { PageSearch } from '@renderer/components/notebooks/PageSearch'
import { SectionTabs } from '@renderer/components/notebooks/SectionTabs'
import { PageList } from '@renderer/components/notebooks/PageList'
import { UNTITLED_PAGE } from '@renderer/components/notebooks/notebookUi'
import { PageEditor, type PageEditorHandle } from '@renderer/components/notebooks/PageEditor'
import {
  NameColorDialog,
  type NameColorValue
} from '@renderer/components/notebooks/NameColorDialog'
import { errorMessage } from '@renderer/components/settings/settingsStatus'
import { DEFAULT_ZEN_WIDTH, type NotesViewMode } from '@renderer/components/editor/notesLayout'
import { useNotebooks } from '@renderer/hooks/useNotebooks'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { DEFAULT_COLORS } from '@renderer/lib/colors'

type NameDialog =
  | { kind: 'notebook'; target: Notebook | null }
  | { kind: 'section'; target: NotebookSection | null }

type DeleteTarget =
  | { kind: 'notebook'; item: Notebook }
  | { kind: 'section'; item: NotebookSection }
  | { kind: 'page'; item: NotebookPageSummary }

function parseDndId(id: string | number): { kind: string; id: number } {
  const [kind, raw] = String(id).split(':')
  return { kind, id: Number(raw) }
}

function deleteCopy(target: DeleteTarget): { title: string; description: string } {
  switch (target.kind) {
    case 'notebook':
      return {
        title: `Excluir o caderno "${target.item.name}"?`,
        description: 'Todas as seções e páginas dele serão apagadas. Não dá para desfazer.'
      }
    case 'section':
      return {
        title: `Excluir a seção "${target.item.name}"?`,
        description: 'Todas as páginas da seção serão apagadas. Não dá para desfazer.'
      }
    case 'page':
      return {
        title: `Excluir "${target.item.title || UNTITLED_PAGE}"?`,
        description: 'A página e as subpáginas dela serão apagadas. Não dá para desfazer.'
      }
  }
}

const collision: CollisionDetection = (args) => {
  const draggingSection = String(args.active.id).startsWith('s:')
  const droppableContainers = draggingSection
    ? args.droppableContainers.filter((c) => String(c.id).startsWith('s:'))
    : args.droppableContainers
  const within = pointerWithin({ ...args, droppableContainers })
  if (within.length > 0) return within
  const prefix = draggingSection ? 's:' : 'p:'
  return closestCenter({
    ...args,
    droppableContainers: droppableContainers.filter((c) => String(c.id).startsWith(prefix))
  })
}

function useFallbackSelection<T extends { id: number }>(
  ready: boolean,
  items: T[],
  selected: number | null,
  select: (id: number | null) => void,
  first: () => number | null
): void {
  // O id selecionado fica fora das dependências de propósito: logo depois de criar um item ele
  // ainda não está na lista, e reagir a essa troca derrubaria a seleção antes do refresh chegar.
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  const firstRef = useRef(first)
  firstRef.current = first
  useEffect(() => {
    if (!ready) return
    const current = selectedRef.current
    if (current !== null && items.some((i) => i.id === current)) return
    const next = firstRef.current()
    if (next !== current) select(next)
  }, [ready, items, select])
}

export function NotebooksPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [notebookId, setNotebookId] = usePersistedState<number | null>(
    'ticktask.notebooks.notebook',
    null
  )
  const [sectionId, setSectionId] = usePersistedState<number | null>(
    'ticktask.notebooks.section',
    null
  )
  const [pageId, setPageId] = usePersistedState<number | null>('ticktask.notebooks.page', null)
  const { notebooks, notebooksLoaded, sections, pages } = useNotebooks(notebookId, sectionId)
  const [nameDialog, setNameDialog] = useState<NameDialog | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [viewMode, setViewMode] = useState<NotesViewMode>('normal')
  const [syncingNotebookId, setSyncingNotebookId] = useState<number | null>(null)
  const [zenWidth, setZenWidth] = usePersistedState('ticktask.notesZenWidth', DEFAULT_ZEN_WIDTH)
  const editorRef = useRef<PageEditorHandle>(null)
  const editorAreaRef = useRef<HTMLDivElement>(null)

  const sectionsReady = sections.forId !== null && sections.forId === notebookId
  const pagesReady = pages.forId !== null && pages.forId === sectionId

  useFallbackSelection(notebooksLoaded, notebooks, notebookId, setNotebookId, () =>
    notebooks.length > 0 ? notebooks[0].id : null
  )
  useFallbackSelection(sectionsReady, sections.items, sectionId, setSectionId, () =>
    sections.items.length > 0 ? sections.items[0].id : null
  )
  useFallbackSelection(pagesReady, pages.items, pageId, setPageId, () => {
    const flat = flattenPageTree(pages.items)
    return flat.length > 0 ? flat[0].page.id : null
  })

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const run = useCallback(async (action: () => Promise<unknown>): Promise<void> => {
    try {
      await action()
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }, [])

  const leavePage = useCallback(async (): Promise<void> => {
    try {
      await editorRef.current?.flush()
    } catch (error) {
      console.error('Falha ao salvar a página antes de sair:', error)
    }
  }, [])

  const selectNotebook = async (id: number): Promise<void> => {
    if (id === notebookId) return
    await leavePage()
    setNotebookId(id)
    setSectionId(null)
    setPageId(null)
  }

  const selectSection = async (id: number): Promise<void> => {
    if (id === sectionId) return
    await leavePage()
    setSectionId(id)
    setPageId(null)
  }

  const selectPage = async (id: number): Promise<void> => {
    if (id === pageId) return
    await leavePage()
    setPageId(id)
  }

  const openPage = useCallback(
    async (id: number): Promise<void> => {
      const location = await window.api.locatePage(id)
      if (!location) {
        toast.error('Essa página não existe mais.')
        return
      }
      await leavePage()
      setNotebookId(location.notebook_id)
      setSectionId(location.section_id)
      setPageId(location.page_id)
    },
    [leavePage, setNotebookId, setSectionId, setPageId]
  )

  // Menções @ a uma página chegam como /notebooks?page=<id>.
  const requestedPage = Number(searchParams.get('page'))
  useEffect(() => {
    if (!Number.isInteger(requestedPage) || requestedPage <= 0) return
    setSearchParams({}, { replace: true })
    void openPage(requestedPage)
  }, [requestedPage, openPage, setSearchParams])

  const exportNotebook = async (notebook: Notebook): Promise<void> => {
    await leavePage()
    try {
      const result = await window.api.exportNotebookLocal(notebook.id)
      if (result) toast.success(`${result.pages} página(s) exportada(s) em ${result.dir}`)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  const syncNotebook = async (notebook: Notebook): Promise<void> => {
    setSyncingNotebookId(notebook.id)
    try {
      await leavePage()
      await window.api.syncNotebookToNotion(notebook.id)
    } catch (error) {
      console.error('Falha ao sincronizar o caderno com o Notion:', error)
    } finally {
      setSyncingNotebookId(null)
    }
  }

  const goBack = async (): Promise<void> => {
    await leavePage()
    navigate('/')
  }

  const createPage = (parentId: number | null): Promise<void> =>
    run(async () => {
      if (sectionId === null) return
      await leavePage()
      const page = await window.api.createPage({ section_id: sectionId, parent_page_id: parentId })
      setPageId(page.id)
    })

  const placePage = (id: number, placement: PagePlacement | null): Promise<void> =>
    run(async () => {
      if (!placement || sectionId === null) return
      if (!canPlaceUnder(pages.items, id, placement.parent_page_id)) {
        toast.error('Subpáginas vão até 2 níveis.')
        return
      }
      await window.api.movePage(id, { section_id: sectionId, ...placement })
    })

  const handleNameSubmit = async (value: NameColorValue): Promise<void> => {
    if (!nameDialog) return
    await run(async () => {
      if (nameDialog.kind === 'notebook') {
        if (nameDialog.target) {
          await window.api.updateNotebook(nameDialog.target.id, value)
        } else {
          await leavePage()
          const notebook = await window.api.createNotebook(value)
          setNotebookId(notebook.id)
          setSectionId(null)
          setPageId(null)
        }
      } else if (nameDialog.target) {
        await window.api.updateSection(nameDialog.target.id, value)
      } else if (notebookId !== null) {
        await leavePage()
        const section = await window.api.createSection({ notebook_id: notebookId, ...value })
        setSectionId(section.id)
        setPageId(null)
      }
    })
  }

  const handleDelete = (): Promise<void> =>
    run(async () => {
      if (!deleteTarget) return
      const { kind, item } = deleteTarget
      if (kind === 'notebook') await window.api.deleteNotebook(item.id)
      else if (kind === 'section') await window.api.deleteSection(item.id)
      else await window.api.deletePage(item.id)
      setDeleteTarget(null)
    })

  const handleNotebookReorder = (activeKey: string, overKey: string): Promise<void> =>
    run(async () => {
      const ids = notebooks.map((n) => n.id)
      const from = ids.indexOf(Number(activeKey))
      const to = ids.indexOf(Number(overKey))
      if (from < 0 || to < 0) return
      await window.api.reorderNotebooks(arrayMove(ids, from, to))
    })

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over || active.id === over.id) return
    const dragged = parseDndId(active.id)
    const target = parseDndId(over.id)

    if (dragged.kind === 's' && target.kind === 's' && notebookId !== null) {
      const ids = sections.items.map((s) => s.id)
      const from = ids.indexOf(dragged.id)
      const to = ids.indexOf(target.id)
      if (from < 0 || to < 0) return
      void run(() => window.api.reorderSections(notebookId, arrayMove(ids, from, to)))
      return
    }

    if (dragged.kind === 'p' && target.kind === 's') {
      if (target.id === sectionId) return
      const section = sections.items.find((s) => s.id === target.id)
      void run(async () => {
        await window.api.movePage(dragged.id, {
          section_id: target.id,
          parent_page_id: null,
          index: Number.MAX_SAFE_INTEGER
        })
        toast.success(`Página movida para ${section?.name ?? 'outra seção'}.`)
      })
      return
    }

    if (dragged.kind === 'p' && target.kind === 'p') {
      void placePage(dragged.id, dropPlacement(pages.items, dragged.id, target.id))
    }
  }

  const handleZen = useCallback((): void => {
    const width = editorAreaRef.current?.offsetWidth
    if (width && width > 320) setZenWidth(Math.min(width, 900))
    setViewMode('zen')
  }, [setZenWidth])

  useEffect(() => {
    if (viewMode === 'normal') return
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('[data-suggestion-popup]')) return
      setViewMode('normal')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [viewMode])

  const nameDialogInitial: NameColorValue = nameDialog?.target
    ? { name: nameDialog.target.name, color: nameDialog.target.color }
    : { name: '', color: DEFAULT_COLORS[0] }

  const deleteText = deleteTarget ? deleteCopy(deleteTarget) : null

  const focused = viewMode !== 'normal'

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {!focused && (
        <header className="shrink-0 px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => void goBack()}
            className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent"
          >
            <ArrowLeft size={18} className="mr-2" /> Voltar
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <NotebookTabs size={20} className="text-slate-700" />
          <h1 className="text-lg font-bold text-slate-900">Cadernos</h1>
          <div className="ml-auto">
            <PageSearch onOpen={(id) => void openPage(id)} />
          </div>
        </header>
      )}

      <div className="flex flex-1 min-h-0">
        {!focused && (
          <NotebookList
            notebooks={notebooks}
            selectedId={notebookId}
            onSelect={(id) => void selectNotebook(id)}
            onCreate={() => setNameDialog({ kind: 'notebook', target: null })}
            onEdit={(notebook) => setNameDialog({ kind: 'notebook', target: notebook })}
            onDelete={(notebook) => setDeleteTarget({ kind: 'notebook', item: notebook })}
            onSync={(notebook) => void syncNotebook(notebook)}
            syncingId={syncingNotebookId}
            onExport={(notebook) => void exportNotebook(notebook)}
            onReorder={(a, b) => void handleNotebookReorder(a, b)}
          />
        )}

        {notebookId === null ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <NotebookTabs size={32} />
            <p className="text-sm">
              {notebooksLoaded ? 'Crie um caderno para começar.' : 'Carregando...'}
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={collision} onDragEnd={handleDragEnd}>
            <div className="flex-1 min-w-0 flex flex-col">
              {!focused && (
                <SectionTabs
                  sections={sectionsReady ? sections.items : []}
                  selectedId={sectionId}
                  onSelect={(id) => void selectSection(id)}
                  onCreate={() => setNameDialog({ kind: 'section', target: null })}
                  onEdit={(section) => setNameDialog({ kind: 'section', target: section })}
                  onDelete={(section) => setDeleteTarget({ kind: 'section', item: section })}
                />
              )}
              <div className="flex flex-1 min-h-0">
                {!focused && (
                  <PageList
                    pages={pagesReady ? pages.items : []}
                    selectedId={pageId}
                    disabled={sectionId === null}
                    canIndent={(id) => {
                      const placement = indentPlacement(pages.items, id)
                      return !!placement && canPlaceUnder(pages.items, id, placement.parent_page_id)
                    }}
                    onSelect={(id) => void selectPage(id)}
                    onCreate={(parentId) => void createPage(parentId)}
                    onIndent={(id) => void placePage(id, indentPlacement(pages.items, id))}
                    onOutdent={(id) => void placePage(id, outdentPlacement(pages.items, id))}
                    onDelete={(page) => setDeleteTarget({ kind: 'page', item: page })}
                  />
                )}
                <div ref={editorAreaRef} className="relative flex-1 min-w-0 flex">
                  {pageId !== null ? (
                    <PageEditor
                      key={pageId}
                      ref={editorRef}
                      pageId={pageId}
                      viewMode={viewMode}
                      zenWidth={zenWidth}
                      onMaximize={() => setViewMode('maximized')}
                      onZen={handleZen}
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-slate-400 bg-white">
                      {sectionId === null ? 'Crie uma seção.' : 'Crie uma página nesta seção.'}
                    </div>
                  )}
                  {focused && (
                    <button
                      onClick={() => setViewMode('normal')}
                      title="Voltar ao normal (Esc)"
                      className="absolute bottom-8 right-8 z-20 h-11 w-11 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
                    >
                      <Minimize2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </DndContext>
        )}
      </div>

      <NameColorDialog
        open={nameDialog !== null}
        title={
          nameDialog?.kind === 'notebook'
            ? nameDialog.target
              ? 'Editar caderno'
              : 'Novo caderno'
            : nameDialog?.target
              ? 'Editar seção'
              : 'Nova seção'
        }
        placeholder={nameDialog?.kind === 'notebook' ? 'Trabalho' : 'Reuniões'}
        initial={nameDialogInitial}
        onOpenChange={(open) => !open && setNameDialog(null)}
        onSubmit={handleNameSubmit}
      />

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title={deleteText?.title}
        description={deleteText?.description}
        confirmLabel="Excluir"
      />
    </div>
  )
}
