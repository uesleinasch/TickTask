import { promises as fs, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { UNTITLED_PAGE } from '@shared/notebookTree'
import { notebookDb } from './database'
import { getNotebook, getPage, getSection, listPages, listSections } from './notebookQueries'
import { prosemirrorToMarkdown } from './notesMarkdown'
import { copyNoteAssets, markdownRef, writeDrawingFiles, yaml } from './localExport'
import { planNotebookExport, safeFileName } from './notebookExportPlan'

async function writePageFile(pageId: number, filePath: string, assetsDir: string): Promise<void> {
  const db = notebookDb()
  const page = getPage(db, pageId)
  if (!page) throw new Error('Página não encontrada.')
  const section = getSection(db, page.section_id)
  const notebook = section ? getNotebook(db, section.notebook_id) : undefined

  const dir = path.dirname(filePath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

  const assetMap = await copyNoteAssets(page.notes, assetsDir)
  const body = prosemirrorToMarkdown(page.notes, (id) =>
    assetMap[id] ? markdownRef(dir, assetMap[id]) : `assets/${id}`
  )
  const pngPath = await writeDrawingFiles(
    { kind: 'page', id: page.id },
    page.drawing,
    assetsDir,
    `desenho-pagina-${page.id}`
  )
  const title = page.title || UNTITLED_PAGE
  const frontmatter = [
    '---',
    `titulo: ${yaml(title)}`,
    `caderno: ${yaml(notebook?.name)}`,
    `secao: ${yaml(section?.name)}`,
    `criada_em: ${yaml(page.created_at)}`,
    `atualizado_em: ${yaml(page.updated_at)}`,
    '---'
  ].join('\n')
  const drawingSection = pngPath
    ? `\n\n## Desenho\n\n![Desenho](${markdownRef(dir, pngPath)})\n`
    : ''
  await fs.writeFile(filePath, `${frontmatter}\n\n# ${title}\n\n${body}\n${drawingSection}`, 'utf8')
}

/** Uma página em `filePath`; imagens e desenho vão para `assets/` ao lado do arquivo. */
export async function exportPageToFile(pageId: number, filePath: string): Promise<void> {
  await writePageFile(pageId, filePath, path.join(path.dirname(filePath), 'assets'))
}

export function defaultPageFileName(pageId: number): string {
  const page = getPage(notebookDb(), pageId)
  return `${safeFileName(page?.title ?? '', UNTITLED_PAGE)}.md`
}

/**
 * O caderno inteiro numa pasta `<destDir>/<caderno>/`: uma pasta por seção, um `.md` por página e
 * as imagens de todas as páginas num `assets/` comum.
 */
export async function exportNotebookToDir(
  notebookId: number,
  destDir: string
): Promise<{ dir: string; pages: number }> {
  const db = notebookDb()
  const notebook = getNotebook(db, notebookId)
  if (!notebook) throw new Error('Caderno não encontrado.')

  const root = path.join(destDir, safeFileName(notebook.name, 'Caderno'))
  const sections = listSections(db, notebookId)
  const pages = sections.flatMap((s) => listPages(db, s.id))
  const plan = planNotebookExport(sections, pages)
  const assetsDir = path.join(root, 'assets')
  if (!existsSync(root)) mkdirSync(root, { recursive: true })

  for (const entry of plan) {
    await writePageFile(entry.pageId, path.join(root, ...entry.relPath.split('/')), assetsDir)
  }
  return { dir: root, pages: plan.length }
}
