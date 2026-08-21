import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { TaskListFilters } from '@shared/types'
import { z } from 'zod'
import {
  countTasks,
  getSubtasks,
  getTask,
  getTaskDependencies,
  getTaskDependents,
  getTimeEntries,
  listContexts,
  listProjects,
  listTasks
} from '../../database'
import { prosemirrorToMarkdown } from '../../notesMarkdown'
import { fail, ok } from '../reply'
import { resolveByName } from '../resolve'

const STATUS = z.enum(['inbox', 'aguardando', 'proximas', 'executando', 'finalizada', 'someday'])
const CATEGORY = z.enum(['urgente', 'prioridade', 'normal', 'time_leak'])
const ENERGY = z.enum(['alto', 'medio', 'baixo'])

export function registerTaskTools(server: McpServer): void {
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

      if (args.withoutProject) {
        filters.projectId = 'none'
      } else if (args.project !== undefined) {
        const resolved = resolveByName(listProjects(), args.project)
        if (!resolved.ok) {
          return fail(resolved.code, 'Projeto não encontrado ou ambíguo.', {
            candidates: resolved.candidates
          })
        }
        filters.projectId = resolved.id
      }

      if (args.context !== undefined) {
        const resolved = resolveByName(listContexts(), args.context)
        if (!resolved.ok) {
          return fail(resolved.code, 'Contexto não encontrado ou ambíguo.', {
            candidates: resolved.candidates
          })
        }
        filters.contextId = resolved.id
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

      return ok({
        task,
        notes_markdown: task.notes ? prosemirrorToMarkdown(task.notes) : null,
        subtasks: getSubtasks(id),
        depends_on: getTaskDependencies(id),
        blocked_task_ids: getTaskDependents(id),
        time_entries: getTimeEntries(id)
      })
    }
  )
}
