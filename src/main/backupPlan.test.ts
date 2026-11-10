import { describe, expect, it } from 'vitest'
import {
  buildManifest,
  parseManifestCounts,
  parseSnapshotName,
  preRestoreName,
  snapshotName,
  sortSnapshotNames
} from './backupPlan'

describe('snapshotName', () => {
  it('usa data e hora locais com zeros à esquerda', () => {
    expect(snapshotName(new Date(2026, 0, 5, 7, 8, 9))).toBe('2026-01-05_070809')
  })

  it('é revertido por parseSnapshotName', () => {
    const date = new Date(2026, 10, 9, 19, 21, 5)
    expect(parseSnapshotName(snapshotName(date))?.getTime()).toBe(date.getTime())
  })
})

describe('parseSnapshotName', () => {
  it('rejeita nomes fora do padrão', () => {
    expect(parseSnapshotName('2026-11-09_192105.partial')).toBeNull()
    expect(parseSnapshotName('pre-restore-2026-11-09_192105')).toBeNull()
    expect(parseSnapshotName('ticktask-backup.sh')).toBeNull()
  })
})

describe('sortSnapshotNames', () => {
  it('mantém só snapshots, do mais recente para o mais antigo', () => {
    expect(
      sortSnapshotNames([
        '2026-11-01_080000',
        'ticktask-backup.sh',
        '2026-11-09_192105',
        '2026-11-09_192105.partial',
        '2026-11-09_101010'
      ])
    ).toEqual(['2026-11-09_192105', '2026-11-09_101010', '2026-11-01_080000'])
  })
})

describe('preRestoreName', () => {
  it('prefixa o carimbo do snapshot', () => {
    expect(preRestoreName(new Date(2026, 10, 9, 8, 0, 0))).toBe('pre-restore-2026-11-09_080000')
  })
})

describe('manifest', () => {
  const manifest = buildManifest({
    createdAt: new Date('2026-11-09T22:21:05.000Z'),
    host: 'maquina',
    origin: '/home/u/.config/ticktask',
    counts: { tasks: 447, projects: 23, timeEntries: null },
    hashes: [
      { file: 'ticktask.db', sha256: 'bbb' },
      { file: 'drawings/1.png', sha256: 'aaa' }
    ]
  })

  it('lista os hashes ordenados pelo caminho', () => {
    expect(manifest).toContain('sha256:\naaa  ./drawings/1.png\nbbb  ./ticktask.db\n')
  })

  it('tem as contagens lidas de volta, com ? para desconhecido', () => {
    expect(manifest).toContain('entradas tempo:  ?')
    expect(parseManifestCounts(manifest)).toEqual({ tasks: 447, projects: 23, timeEntries: null })
  })

  it('lê o manifest gerado pelo script de shell', () => {
    const fromScript = [
      'data:            2026-11-09T19:21:05-03:00',
      'máquina:         JACPONTNX23',
      'origem:          /home/u/.config/ticktask',
      'tasks:           447',
      'projetos:        23',
      'entradas tempo:  83',
      '',
      'sha256:'
    ].join('\n')
    expect(parseManifestCounts(fromScript)).toEqual({ tasks: 447, projects: 23, timeEntries: 83 })
  })
})
