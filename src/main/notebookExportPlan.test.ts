import { describe, expect, it } from 'vitest'
import { planNotebookExport, safeFileName, type ExportPage } from './notebookExportPlan'

function page(
  id: number,
  section_id: number,
  title: string,
  parent: number | null = null,
  position = id
): ExportPage {
  return { id, section_id, title, parent_page_id: parent, position }
}

describe('safeFileName', () => {
  it('troca caracteres proibidos e usa o fallback quando sobra nada', () => {
    expect(safeFileName('Ata: 10/11 "final"?', 'x')).toBe('Ata_ 10_11 _final_')
    expect(safeFileName(' ... ', 'Página')).toBe('Página')
    expect(safeFileName('a'.repeat(200), 'x')).toHaveLength(80)
  })
})

describe('planNotebookExport', () => {
  it('seção vira pasta, subpáginas ficam na pasta da mãe e nomes repetidos ganham sufixo', () => {
    const plan = planNotebookExport(
      [
        { id: 1, name: 'Reuniões' },
        { id: 2, name: 'reuniões' },
        { id: 3, name: 'Assets' }
      ],
      [
        page(10, 1, 'Ata'),
        page(11, 1, 'Detalhes', 10),
        page(12, 1, 'Anexo', 11),
        page(13, 1, 'Ata'),
        page(14, 1, ''),
        page(20, 2, 'Outra'),
        page(30, 3, 'Fotos')
      ]
    )
    expect(plan).toEqual([
      { pageId: 10, relPath: 'Reuniões/Ata.md' },
      { pageId: 11, relPath: 'Reuniões/Ata/Detalhes.md' },
      { pageId: 12, relPath: 'Reuniões/Ata/Detalhes/Anexo.md' },
      { pageId: 13, relPath: 'Reuniões/Ata (2).md' },
      { pageId: 14, relPath: 'Reuniões/Página sem título.md' },
      { pageId: 20, relPath: 'reuniões (2)/Outra.md' },
      { pageId: 30, relPath: 'Assets (2)/Fotos.md' }
    ])
  })
})
