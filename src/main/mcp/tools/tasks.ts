import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CreateTaskInput, Task, TaskListFilters, UpdateTaskInput } from '@shared/types'
import { z } from 'zod'
import {
  countTasks,
  createTask,
  getSubtasks,
  getTask,
  getTaskDependencies,
  getTaskDependents,
  getTimeEntries,
  listContexts,
  listProjects,
  listTasks,
  updateTask
} from '../../database'
import { prosemirrorToMarkdown } from '../../notesMarkdown'
import { afterTaskWrite } from '../effects'
import { fail, ok } from '../reply'
import { resolveByName } from '../resolve'

const STATUS = z.enum(['inbox', 'aguardando', 'proximas', 'executando', 'finalizada', 'someday'])
const CATEGORY = z.enum(['urgente', 'prioridade', 'normal', 'time_leak'])
const ENERGY = z.enum(['alto', 'medio', 'baixo'])

type Resolution = { ok: true; id: number } | { ok: false; response: ReturnType<typeof fail> }

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
      const taskWithoutNotes: Task = { ...task }
      delete taskWithoutNotes.notes

      return ok({
        task: taskWithoutNotes,
        notes_markdown: notesMarkdown,
        subtasks: getSubtasks(id),
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
        'Cria uma task. Projeto e contextos aceitam nome ou id; tags são criadas se não existirem. Use parent_task_id para criar subtarefa.',
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

      if (args.status !== undefined) {
        updateTask(task.id, { status: args.status })
      }

      afterTaskWrite(task.id)
      return ok({ created: task.id, task: getTask(task.id) })
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
      return ok({ updated: args.id, task: getTask(args.id) })
    }
  )
}
