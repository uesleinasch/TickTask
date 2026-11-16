import { UNTITLED_PAGE, flattenPageTree, type PageNode } from '@shared/notebookTree'

const MAX_NAME = 80

export function safeFileName(name: string, fallback: string): string {
  const cleaned = name
    .replace(/[<>:"/\\|?*]+/g, '_')
    .split('')
    .filter((c) => c.charCodeAt(0) >= 32)
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.]+|[\s.]+$/g, '')
    .slice(0, MAX_NAME)
    .trim()
  return cleaned || fallback
}

function uniqueName(base: string, taken: Set<string>): string {
  let name = base
  for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} (${n})`
  taken.add(name.toLowerCase())
  return name
}

export interface ExportSection {
  id: number
  name: string
}

export interface ExportPage extends PageNode {
  section_id: number
  title: string
}

export interface PlannedPageFile {
  pageId: number
  /** Caminho relativo à pasta do caderno, com "/" como separador. */
  relPath: string
}

/**
 * Seção vira pasta; página vira `<título>.md`; as subpáginas ficam numa pasta com o nome da página
 * mãe, ao lado do arquivo dela. Nomes repetidos na mesma pasta ganham " (2)", " (3)"...
 */
export function planNotebookExport(
  sections: ExportSection[],
  pages: ExportPage[]
): PlannedPageFile[] {
  const out: PlannedPageFile[] = []
  // "assets" é a pasta das imagens do caderno; uma seção com esse nome ganha sufixo.
  const sectionNames = new Set<string>(['assets'])

  for (const section of sections) {
    const sectionDir = uniqueName(safeFileName(section.name, 'Seção'), sectionNames)
    const sectionPages = pages.filter((p) => p.section_id === section.id)
    const titleOf = new Map(sectionPages.map((p) => [p.id, p.title]))
    const dirOf = new Map<number | null, string>([[null, sectionDir]])
    const takenIn = new Map<string, Set<string>>()

    for (const { page } of flattenPageTree(sectionPages)) {
      const parentDir = dirOf.get(page.parent_page_id) ?? sectionDir
      const taken = takenIn.get(parentDir) ?? new Set<string>()
      takenIn.set(parentDir, taken)
      const name = uniqueName(safeFileName(titleOf.get(page.id) ?? '', UNTITLED_PAGE), taken)
      dirOf.set(page.id, `${parentDir}/${name}`)
      out.push({ pageId: page.id, relPath: `${parentDir}/${name}.md` })
    }
  }
  return out
}
