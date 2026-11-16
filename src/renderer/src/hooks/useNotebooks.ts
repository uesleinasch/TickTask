import { useEffect, useState } from 'react'
import type { Notebook, NotebookPageSummary, NotebookSection } from '@shared/types'

interface Loaded<T> {
  forId: number | null
  items: T[]
}

const EMPTY = { forId: null, items: [] }

function useScopedList<T>(
  id: number | null,
  version: number,
  load: (id: number) => Promise<T[]>
): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>(EMPTY)
  useEffect(() => {
    if (id === null) {
      setState(EMPTY)
      return
    }
    let cancelled = false
    load(id)
      .then((items) => {
        if (!cancelled) setState({ forId: id, items })
      })
      .catch((e) => console.error('Falha ao carregar cadernos:', e))
    return () => {
      cancelled = true
    }
  }, [id, version, load])
  return state
}

const loadSections = (id: number): Promise<NotebookSection[]> => window.api.listSections(id)
const loadPages = (id: number): Promise<NotebookPageSummary[]> => window.api.listPages(id)

/**
 * Cadernos, seções do caderno aberto e páginas da seção aberta. As mutações não recarregam nada
 * por conta própria: o main emite notebooks:refresh depois de cada uma.
 */
export function useNotebooks(
  notebookId: number | null,
  sectionId: number | null
): {
  notebooks: Notebook[]
  notebooksLoaded: boolean
  sections: Loaded<NotebookSection>
  pages: Loaded<NotebookPageSummary>
} {
  const [version, setVersion] = useState(0)
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [notebooksLoaded, setNotebooksLoaded] = useState(false)

  useEffect(() => window.api.onNotebooksRefresh(() => setVersion((v) => v + 1)), [])

  useEffect(() => {
    let cancelled = false
    window.api
      .listNotebooks()
      .then((items) => {
        if (cancelled) return
        setNotebooks(items)
        setNotebooksLoaded(true)
      })
      .catch((e) => console.error('Falha ao carregar cadernos:', e))
    return () => {
      cancelled = true
    }
  }, [version])

  const sections = useScopedList(notebookId, version, loadSections)
  const pages = useScopedList(sectionId, version, loadPages)

  return { notebooks, notebooksLoaded, sections, pages }
}
