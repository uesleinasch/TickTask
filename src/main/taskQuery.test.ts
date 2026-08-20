import { describe, it, expect } from 'vitest'
import {
  buildTaskCountQuery,
  buildTaskListQuery,
  buildTaskListWhere,
  escapeLike
} from './taskQuery'

const COLUMNS = 't.id, t.name'

describe('buildTaskListWhere', () => {
  it('sempre restringe a tarefas raiz e parametriza o arquivamento', () => {
    const { clause, params } = buildTaskListWhere({})

    expect(clause).toBe('t.is_archived = ? AND t.parent_task_id IS NULL')
    expect(params).toEqual([0])
  })

  it('trata archived como 1', () => {
    expect(buildTaskListWhere({ archived: true }).params).toEqual([1])
  })

  it('adiciona status quando não é "all"', () => {
    const { clause, params } = buildTaskListWhere({ status: 'inbox' })

    expect(clause).toContain('t.status = ?')
    expect(params).toEqual([0, 'inbox'])
  })

  it('ignora status "all"', () => {
    expect(buildTaskListWhere({ status: 'all' }).clause).not.toContain('t.status')
  })

  it('adiciona categoria quando não é "all"', () => {
    const { clause, params } = buildTaskListWhere({ category: 'urgente' })

    expect(clause).toContain('t.category = ?')
    expect(params).toEqual([0, 'urgente'])
  })

  it('ignora categoria "all"', () => {
    expect(buildTaskListWhere({ category: 'all' }).clause).not.toContain('t.category')
  })

  it('filtra por projeto informado', () => {
    const { clause, params } = buildTaskListWhere({ projectId: 7 })

    expect(clause).toContain('t.project_id = ?')
    expect(params).toEqual([0, 7])
  })

  it('filtra tarefas sem projeto sem consumir parâmetro', () => {
    const { clause, params } = buildTaskListWhere({ projectId: 'none' })

    expect(clause).toContain('t.project_id IS NULL')
    expect(params).toEqual([0])
  })

  it('ignora projectId nulo', () => {
    expect(buildTaskListWhere({ projectId: null }).clause).not.toContain('t.project_id')
  })

  it('filtra tag por EXISTS para não duplicar linhas', () => {
    const { clause, params } = buildTaskListWhere({ tagId: 3 })

    expect(clause).toContain('EXISTS (SELECT 1 FROM task_tags')
    expect(clause).not.toContain('JOIN task_tags')
    expect(params).toEqual([0, 3])
  })

  it('filtra contexto por EXISTS', () => {
    const { clause, params } = buildTaskListWhere({ contextId: 5 })

    expect(clause).toContain('EXISTS (SELECT 1 FROM task_contexts')
    expect(params).toEqual([0, 5])
  })

  it('busca em nome e descrição', () => {
    const { clause, params } = buildTaskListWhere({ search: 'relatório' })

    expect(clause).toContain('t.name LIKE ?')
    expect(clause).toContain('t.description LIKE ?')
    expect(params).toEqual([0, '%relatório%', '%relatório%'])
  })

  it('ignora busca vazia ou só com espaços', () => {
    expect(buildTaskListWhere({ search: '   ' }).clause).not.toContain('LIKE')
    expect(buildTaskListWhere({ search: '' }).params).toEqual([0])
  })

  it('escapa curingas do LIKE na busca', () => {
    const { clause, params } = buildTaskListWhere({ search: '100%_a\\b' })

    expect(clause).toContain("ESCAPE '\\'")
    expect(params[1]).toBe('%100\\%\\_a\\\\b%')
  })

  it('filtra apenas bloqueadas por dependência não finalizada', () => {
    const { clause, params } = buildTaskListWhere({ blockedOnly: true })

    expect(clause).toContain('FROM task_dependencies')
    expect(clause).toContain("dep.status != 'finalizada'")
    expect(params).toEqual([0])
  })

  it('combina filtros preservando a ordem dos parâmetros', () => {
    const { params } = buildTaskListWhere({
      archived: true,
      status: 'proximas',
      category: 'urgente',
      projectId: 2,
      tagId: 4,
      contextId: 6,
      search: 'x'
    })

    expect(params).toEqual([1, 'proximas', 'urgente', 2, 4, 6, '%x%', '%x%'])
  })
})

describe('buildTaskListQuery', () => {
  it('ordena por atualização mais recente por padrão', () => {
    const { sql } = buildTaskListQuery(COLUMNS, {})

    expect(sql).toContain('ORDER BY t.updated_at DESC')
    expect(sql).toContain('FROM tasks t')
    expect(sql).toContain('LEFT JOIN projects p ON t.project_id = p.id')
    expect(sql).toContain(COLUMNS)
  })

  it('ordena por prazo jogando tarefas sem prazo para o fim', () => {
    const { sql } = buildTaskListQuery(COLUMNS, { sort: 'due_date' })

    expect(sql).toContain('ORDER BY t.due_date IS NULL, t.due_date ASC')
  })

  it('cai no padrão quando o sort é desconhecido', () => {
    const { sql } = buildTaskListQuery(COLUMNS, {
      sort: 'drop table' as unknown as 'updated'
    })

    expect(sql).toContain('ORDER BY t.updated_at DESC')
    expect(sql).not.toContain('drop table')
  })

  it('não pagina quando limit não é informado', () => {
    const { sql, params } = buildTaskListQuery(COLUMNS, { offset: 40 })

    expect(sql).not.toContain('LIMIT')
    expect(sql).not.toContain('OFFSET')
    expect(params).toEqual([0])
  })

  it('pagina com limit e offset depois dos parâmetros do filtro', () => {
    const { sql, params } = buildTaskListQuery(COLUMNS, {
      status: 'inbox',
      limit: 50,
      offset: 100
    })

    expect(sql).toContain('LIMIT ? OFFSET ?')
    expect(params).toEqual([0, 'inbox', 50, 100])
  })

  it('aceita limit sem offset', () => {
    const { sql, params } = buildTaskListQuery(COLUMNS, { limit: 25 })

    expect(sql).toContain('LIMIT ?')
    expect(sql).not.toContain('OFFSET')
    expect(params).toEqual([0, 25])
  })
})

describe('buildTaskCountQuery', () => {
  it('conta com o mesmo WHERE, sem ordenação nem paginação', () => {
    const filters = { status: 'inbox' as const, limit: 10 }
    const count = buildTaskCountQuery(filters)

    expect(count.sql).toContain('SELECT COUNT(*) as total')
    expect(count.sql).toContain(buildTaskListWhere(filters).clause)
    expect(count.sql).not.toContain('ORDER BY')
    expect(count.sql).not.toContain('LIMIT')
    expect(count.params).toEqual([0, 'inbox'])
  })
})

describe('escapeLike', () => {
  it('neutraliza curingas e a própria barra de escape', () => {
    expect(escapeLike('a%b_c\\d')).toBe('a\\%b\\_c\\\\d')
  })

  it('deixa texto comum intacto', () => {
    expect(escapeLike('relatório final')).toBe('relatório final')
  })
})
