import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CreateTaskInput, Task, TaskListFilters, UpdateTaskInput } from '@shared/types'
import { z } from 'zod'
import {
  archiveTask,
  countTasks,
  createTask,
  deleteTasks,
  getChildTaskIds,
  getGtdMetrics,
  getReviewHealthIndicators,
  getSubtasks,
  getTask,
  getTaskDependencies,
  getTaskDependents,
  getTimeEntries,
  listContexts,
  listProjects,
  listTasks,
  moveTasksToProject,
  unarchiveTask,
  updateTask,
  updateTasksStatus
} from '../../database'
import { prosemirrorToMarkdown } from '../../notesMarkdown'
import { needsConfirmation } from '../confirmGuard'
import { afterTaskWrite, broadcastRefresh } from '../effects'
import { fail, ok } from '../reply'
import { resolveByName } from '../resolve'
import type { ToolContext } from '../toolContext'

const STATUS = z.enum(['inbox', 'aguardando', 'proximas', 'executando', 'finalizada', 'someday'])
const CATEGORY = z.enum(['urgente', 'prioridade', 'normal', 'time_leak'])
const ENERGY = z.enum(['alto', 'medio', 'baixo'])

type Resolution = { ok: true; id: number } | { ok: false; response: ReturnType<typeof fail> }

// Invariante do projeto: só read_notes e o notes_markdown de get_task carregam corpo de nota;
// todo outro retorno de task precisa passar por aqui.
function stripNotes(task: Task): Task {
  const clean: Task = { ...task }
  delete clean.notes
  return clean
}

function resolveProject(input: string | number): Resolution {
  const resolved = resolveByName(listProjects(), input)
  if (resolved.ok) return { ok: true, id: resolved.id }
  return {
    ok: false,
    response: fail(resolved.code, 'Projeto não encontrado ou ambíguo.', {
      candidates: resolved.candidates
    })
  }
}

function resolveContextIds(
  inputs: Array<string | number>
): { ok: true; ids: number[] } | { ok: false; response: ReturnType<typeof fail> } {
  const rows = listContexts()
  const ids: number[] = []
  for (const input of inputs) {
    const resolved = resolveByName(rows, input)
    if (!resolved.ok) {
      return {
        ok: false,
        response: fail(resolved.code, `Contexto "${input}" não encontrado ou ambíguo.`, {
          candidates: resolved.candidates
        })
      }
    }
    ids.push(resolved.id)
  }
  return { ok: true, ids }
}

export function registerTaskTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'search_tasks',
    {
      title: 'Buscar tasks',
      description:
        'Lista tasks com filtros. Não inclui subtarefas nem o corpo das notas. Use get_task para o detalhe completo de uma task.',
      inputSchema: {
        status: STATUS.optional(),
        category: CATEGORY.optional(),
        energy: ENERGY.optional(),
        project: z.union([z.string(), z.number()]).optional(),
        context: z.union([z.string(), z.number()]).optional(),
        search: z.string().optional(),
        withoutProject: z.boolean().optional(),
        blockedOnly: z.boolean().optional(),
        dueBefore: z.string().optional(),
        dueAfter: z.string().optional(),
        archived: z.boolean().optional(),
        sort: z.enum(['updated', 'due_date']).optional(),
        limit: z.number().int().min(1).max(200).optional(),
        offset: z.number().int().min(0).optional()
      }
    },
    async (args) => {
      const filters: TaskListFilters = {
        archived: args.archived ?? false,
        sort: args.sort ?? 'updated',
        limit: args.limit ?? 50,
        offset: args.offset ?? 0
      }

      if (args.status) filters.status = args.status
      if (args.category) filters.category = args.category
      if (args.energy) filters.energy = args.energy
      if (args.search) filters.search = args.search
      if (args.blockedOnly) filters.blockedOnly = args.blockedOnly
      if (args.dueBefore) filters.dueBefore = args.dueBefore
      if (args.dueAfter) filters.dueAfter = args.dueAfter

      if (args.withoutProject && args.project !== undefined) {
        return fail(
          'validation',
          'Use "project" para filtrar por um projeto específico ou "withoutProject" para tasks sem projeto, não os dois juntos.'
        )
      }

      if (args.withoutProject) {
        filters.projectId = 'none'
      } else if (args.project !== undefined) {
        const project = resolveProject(args.project)
        if (!project.ok) return project.response
        filters.projectId = project.id
      }

      if (args.context !== undefined) {
        const contexts = resolveContextIds([args.context])
        if (!contexts.ok) return contexts.response
        filters.contextId = contexts.ids[0]
      }

      return ok({
        total: countTasks(filters),
        tasks: listTasks(filters)
      })
    }
  )

  server.registerTool(
    'get_task',
    {
      title: 'Detalhe de uma task',
      description:
        'Traz uma task completa: campos, notas em Markdown, subtarefas, dependências e registros de tempo.',
      inputSchema: { id: z.number().int().positive() }
    },
    async ({ id }) => {
      const task = getTask(id)
      if (!task) return fail('not_found', `Task ${id} não existe.`)

      const notesMarkdown = task.notes ? prosemirrorToMarkdown(task.notes) : null

      return ok({
        task: stripNotes(task),
        notes_markdown: notesMarkdown,
        subtasks: getSubtasks(id).map(stripNotes),
        depends_on: getTaskDependencies(id),
        blocked_task_ids: getTaskDependents(id),
        time_entries: getTimeEntries(id)
      })
    }
  )

  server.registerTool(
    'create_task',
    {
      title: 'Criar task',
      description:
        'Cria uma task. Projeto e contextos aceitam nome ou id e falham com candidatos se não forem encontrados; tags são criadas se não existirem. Use parent_task_id para criar subtarefa.',
      inputSchema: {
        name: z.string().min(1),
        description: z.string().optional(),
        status: STATUS.optional(),
        category: CATEGORY.optional(),
        energy: ENERGY.optional(),
        project: z.union([z.string(), z.number()]).optional(),
        contexts: z.array(z.union([z.string(), z.number()])).optional(),
        tags: z.array(z.string()).optional(),
        due_date: z.string().optional(),
        scheduled_date: z.string().optional(),
        parent_task_id: z.number().int().positive().optional()
      }
    },
    async (args) => {
      const input: CreateTaskInput = {
        name: args.name,
        description: args.description,
        category: args.category,
        energy_level: args.energy,
        due_date: args.due_date,
        scheduled_date: args.scheduled_date,
        parent_task_id: args.parent_task_id
      }

      if (args.project !== undefined) {
        const project = resolveProject(args.project)
        if (!project.ok) return project.response
        input.project_id = project.id
      }

      if (args.contexts?.length) {
        const contexts = resolveContextIds(args.contexts)
        if (!contexts.ok) return contexts.response
        input.contextIds = contexts.ids
      }

      if (args.tags?.length) {
        input.tagNames = args.tags
      }

      const task = createTask(input)

      // afterTaskWrite precisa rodar mesmo se o backfill de status falhar — a task já foi
      // persistida e não pode ficar sem sync no Notion nem tasks:refresh.
      try {
        if (args.status !== undefined) {
          updateTask(task.id, { status: args.status })
        }
      } finally {
        afterTaskWrite(task.id)
      }

      return ok({ created: task.id, task: stripNotes(getTask(task.id)!) })
    }
  )

  server.registerTool(
    'update_task',
    {
      title: 'Atualizar uma task',
      description:
        'Altera campos de UMA task. Para mexer em várias de uma vez use bulk_update_tasks. Passar tags ou contexts substitui a lista inteira, não acrescenta. Tag inexistente é criada; projeto ou contexto inexistente falha com candidatos.',
      inputSchema: {
        id: z.number().int().positive(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        status: STATUS.optional(),
        category: CATEGORY.optional(),
        energy: ENERGY.optional(),
        project: z.union([z.string(), z.number(), z.null()]).optional(),
        contexts: z.array(z.union([z.string(), z.number()])).optional(),
        tags: z.array(z.string()).optional(),
        due_date: z.union([z.string(), z.null()]).optional(),
        scheduled_date: z.union([z.string(), z.null()]).optional()
      }
    },
    async (args) => {
      if (!getTask(args.id)) return fail('not_found', `Task ${args.id} não existe.`)

      const patch: UpdateTaskInput = {}
      if (args.name !== undefined) patch.name = args.name
      if (args.description !== undefined) patch.description = args.description
      if (args.status !== undefined) patch.status = args.status
      if (args.category !== undefined) patch.category = args.category
      if (args.energy !== undefined) patch.energy_level = args.energy
      if (args.due_date !== undefined) patch.due_date = args.due_date
      if (args.scheduled_date !== undefined) patch.scheduled_date = args.scheduled_date

      if (args.project !== undefined) {
        if (args.project === null) {
          patch.project_id = null
        } else {
          const project = resolveProject(args.project)
          if (!project.ok) return project.response
          patch.project_id = project.id
        }
      }

      if (args.contexts !== undefined) {
        const contexts = resolveContextIds(args.contexts)
        if (!contexts.ok) return contexts.response
        patch.contextIds = contexts.ids
      }

      if (args.tags !== undefined) {
        patch.tagNames = args.tags
      }

      if (Object.keys(patch).length > 0) updateTask(args.id, patch)

      afterTaskWrite(args.id)
      return ok({ updated: args.id, task: stripNotes(getTask(args.id)!) })
    }
  )

  server.registerTool(
    'bulk_update_tasks',
    {
      title: 'Alterar várias tasks',
      description: `Altera status, projeto ou arquivamento de várias tasks. Acima de ${ctx.bulkThreshold} itens devolve um preview e um confirm_token: mostre o preview ao usuário e só então repita a chamada com o token.`,
      inputSchema: {
        ids: z.array(z.number().int().positive()).min(1),
        status: STATUS.optional(),
        project: z.union([z.string(), z.number(), z.null()]).optional(),
        archive: z.boolean().optional(),
        confirm_token: z.string().optional()
      }
    },
    async (args) => {
      const ids = [...new Set(args.ids)]

      const changes: Record<string, unknown> = {}
      if (args.status !== undefined) changes.status = args.status
      if (args.archive !== undefined) changes.archive = args.archive

      let projectId: number | null | undefined
      if (args.project !== undefined) {
        if (args.project === null) {
          projectId = null
        } else {
          const project = resolveProject(args.project)
          if (!project.ok) return project.response
          projectId = project.id
        }
        changes.project_id = projectId
      }

      if (Object.keys(changes).length === 0) {
        return fail('validation', 'Informe ao menos um campo para alterar.')
      }

      const found = ids.map((id) => getTask(id)).filter((task) => task !== undefined)
      const missing = ids.filter((id) => !found.some((task) => task!.id === id))
      if (missing.length > 0) {
        return fail('not_found', `Tasks inexistentes: ${missing.join(', ')}.`)
      }

      const sortedIds = [...ids].sort((a, b) => a - b)
      const operation = { kind: 'bulk_update_tasks', payload: { ids: sortedIds, changes } }

      if (needsConfirmation('bulk_update_tasks', ids.length, ctx.bulkThreshold)) {
        if (!args.confirm_token) {
          return fail(
            'needs_confirmation',
            `Esta operação altera ${ids.length} tasks. Mostre o preview ao usuário e repita a chamada com o confirm_token.`,
            {
              confirm_token: ctx.confirmStore.issue(operation),
              changes,
              preview: found.map((task) => ({
                id: task!.id,
                name: task!.name,
                status: task!.status
              }))
            }
          )
        }
        const consumed = ctx.confirmStore.consume(args.confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
      }

      if (args.status !== undefined) updateTasksStatus(ids, args.status)
      if (projectId !== undefined) moveTasksToProject(ids, projectId)
      if (args.archive === true) ids.forEach((id) => archiveTask(id))
      if (args.archive === false) ids.forEach((id) => unarchiveTask(id))

      ids.forEach((id) => afterTaskWrite(id))
      return ok({ updated: ids })
    }
  )

  server.registerTool(
    'delete_tasks',
    {
      title: 'Deletar tasks',
      description:
        'Deleta tasks permanentemente. SEMPRE devolve um preview e um confirm_token na primeira chamada, mesmo para uma única task. Considere arquivar em vez de deletar.',
      inputSchema: {
        ids: z.array(z.number().int().positive()).min(1),
        confirm_token: z.string().optional()
      }
    },
    async (args) => {
      const ids = [...new Set(args.ids)]

      const found = ids.map((id) => getTask(id)).filter((task) => task !== undefined)
      const missing = ids.filter((id) => !found.some((task) => task!.id === id))
      if (missing.length > 0) {
        return fail('not_found', `Tasks inexistentes: ${missing.join(', ')}.`)
      }

      const sortedIds = [...ids].sort((a, b) => a - b)
      const operation = { kind: 'delete_tasks', payload: { ids: sortedIds } }

      if (!args.confirm_token) {
        return fail(
          'needs_confirmation',
          `Deleção permanente de ${ids.length} task(s), incluindo subtarefas. Mostre a lista ao usuário e repita a chamada com o confirm_token.`,
          {
            confirm_token: ctx.confirmStore.issue(operation),
            preview: found.map((task) => ({
              id: task!.id,
              name: task!.name,
              status: task!.status,
              subtasks: getChildTaskIds(task!.id).length
            }))
          }
        )
      }

      const consumed = ctx.confirmStore.consume(args.confirm_token, operation)
      if (!consumed.ok) return fail(consumed.code, consumed.message)

      deleteTasks(ids)
      // deleteTasks também apaga as subtarefas em cascata; a task pai deixou de existir,
      // então sincronizar no Notion não faz sentido — só avisamos a janela para recarregar.
      broadcastRefresh()
      return ok({ deleted: ids })
    }
  )

  server.registerTool(
    'organize_overview',
    {
      title: 'Retrato GTD',
      description:
        'Diagnóstico do sistema: inbox, tasks sem projeto, atrasadas, bloqueadas, someday antigas e métricas GTD. Use antes de propor uma reorganização.',
      inputSchema: {
        today: z.string().describe('Data de referência no formato AAAA-MM-DD'),
        sample_size: z.number().int().min(0).max(50).optional()
      }
    },
    async ({ today, sample_size }) => {
      const limit = sample_size ?? 10
      const sample = (filters: TaskListFilters): Task[] =>
        limit === 0 ? [] : listTasks({ ...filters, limit })

      const inboxFilters: TaskListFilters = { status: 'inbox' }
      const withoutProjectFilters: TaskListFilters = { projectId: 'none' }
      const overdueFilters: TaskListFilters = { dueBefore: today, excludeStatus: ['finalizada'] }
      const blockedFilters: TaskListFilters = { blockedOnly: true, excludeStatus: ['finalizada'] }
      const somedayFilters: TaskListFilters = { status: 'someday' }

      return ok({
        metrics: getGtdMetrics(),
        health: getReviewHealthIndicators(),
        inbox: { total: countTasks(inboxFilters), sample: sample(inboxFilters) },
        without_project: {
          total: countTasks(withoutProjectFilters),
          sample: sample(withoutProjectFilters)
        },
        overdue: {
          total: countTasks(overdueFilters),
          sample: sample({ ...overdueFilters, sort: 'due_date' })
        },
        blocked: { total: countTasks(blockedFilters), sample: sample(blockedFilters) },
        someday: { total: countTasks(somedayFilters), sample: sample(somedayFilters) }
      })
    }
  )
}
