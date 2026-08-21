import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type {
  CreateAreaInput,
  CreateGoalInput,
  CreateProjectInput,
  ProjectStatus,
  UpdateAreaInput,
  UpdateGoalInput,
  UpdateProjectInput,
  UpdateTagInput
} from '@shared/types'
import { z } from 'zod'
import {
  createArea,
  createContext,
  createGoal,
  createProject,
  createTag,
  deleteArea,
  deleteContext,
  deleteGoal,
  deleteProject,
  deleteTag,
  listAreas,
  listContexts,
  listGoals,
  listProjects,
  listTagsWithUsage,
  listTaskIdsWithTag,
  mergeTags,
  updateArea,
  updateContext,
  updateGoal,
  updateProject,
  updateTag
} from '../../database'
import { afterTagChange, broadcastRefresh } from '../effects'
import { fail, ok } from '../reply'
import { resolveByName } from '../resolve'
import type { ToolContext } from '../toolContext'

const ENTITY = z.enum(['project', 'context', 'tag', 'area', 'goal'])
type Entity = z.infer<typeof ENTITY>

interface EntityRow {
  id: number
  name: string
}

type Fields = Record<string, unknown> | undefined

function strField(fields: Fields, key: string): string | undefined {
  const value = fields?.[key]
  return typeof value === 'string' ? value : undefined
}

function numField(fields: Fields, key: string): number | undefined {
  const value = fields?.[key]
  return typeof value === 'number' ? value : undefined
}

function numOrNullField(fields: Fields, key: string): number | null | undefined {
  const value = fields?.[key]
  if (value === null) return null
  return typeof value === 'number' ? value : undefined
}

function listEntityRows(entity: Entity): EntityRow[] {
  switch (entity) {
    case 'project':
      return listProjects()
    case 'context':
      return listContexts()
    case 'tag':
      return listTagsWithUsage()
    case 'area':
      return listAreas()
    case 'goal':
      return listGoals()
  }
}

function buildProjectCreateInput(name: string, fields: Fields): CreateProjectInput {
  return {
    name,
    description: strField(fields, 'description'),
    outcome: strField(fields, 'outcome'),
    status: strField(fields, 'status') as ProjectStatus | undefined,
    color: strField(fields, 'color'),
    due_date: strField(fields, 'due_date'),
    area_id: numField(fields, 'area_id')
  }
}

function buildProjectUpdatePatch(name: string | undefined, fields: Fields): UpdateProjectInput {
  const patch: UpdateProjectInput = {}
  if (name !== undefined) patch.name = name
  const description = strField(fields, 'description')
  if (description !== undefined) patch.description = description
  const outcome = strField(fields, 'outcome')
  if (outcome !== undefined) patch.outcome = outcome
  const status = strField(fields, 'status')
  if (status !== undefined) patch.status = status as ProjectStatus
  const color = strField(fields, 'color')
  if (color !== undefined) patch.color = color
  const dueDate = strField(fields, 'due_date')
  if (dueDate !== undefined) patch.due_date = dueDate
  const areaId = numOrNullField(fields, 'area_id')
  if (areaId !== undefined) patch.area_id = areaId
  return patch
}

function buildAreaCreateInput(name: string, fields: Fields): CreateAreaInput {
  return {
    name,
    description: strField(fields, 'description'),
    icon: strField(fields, 'icon')
  }
}

function buildAreaUpdatePatch(name: string | undefined, fields: Fields): UpdateAreaInput {
  const patch: UpdateAreaInput = {}
  if (name !== undefined) patch.name = name
  const description = strField(fields, 'description')
  if (description !== undefined) patch.description = description
  const icon = strField(fields, 'icon')
  if (icon !== undefined) patch.icon = icon
  return patch
}

function buildGoalUpdatePatch(name: string | undefined, fields: Fields): UpdateGoalInput {
  const patch: UpdateGoalInput = {}
  if (name !== undefined) patch.name = name
  const description = strField(fields, 'description')
  if (description !== undefined) patch.description = description
  const horizon = numField(fields, 'horizon')
  if (horizon === 3 || horizon === 4 || horizon === 5) patch.horizon = horizon
  const areaId = numOrNullField(fields, 'area_id')
  if (areaId !== undefined) patch.area_id = areaId
  return patch
}

function buildContextUpdatePatch(
  name: string | undefined,
  fields: Fields
): { name?: string; icon?: string; color?: string } {
  const patch: { name?: string; icon?: string; color?: string } = {}
  if (name !== undefined) patch.name = name
  const icon = strField(fields, 'icon')
  if (icon !== undefined) patch.icon = icon
  const color = strField(fields, 'color')
  if (color !== undefined) patch.color = color
  return patch
}

function buildTagUpdatePatch(name: string | undefined, fields: Fields): UpdateTagInput {
  const patch: UpdateTagInput = {}
  if (name !== undefined) patch.name = name
  const color = strField(fields, 'color')
  if (color !== undefined) patch.color = color
  return patch
}

export function registerStructureTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'list_structure',
    {
      title: 'Estrutura do sistema',
      description:
        'Projetos, contextos, tags (com uso), áreas e metas num só payload. Chame uma vez para poder usar nomes nas outras tools.',
      inputSchema: {}
    },
    async () =>
      ok({
        projects: listProjects(),
        contexts: listContexts(),
        tags: listTagsWithUsage(),
        areas: listAreas(),
        goals: listGoals()
      })
  )

  server.registerTool(
    'manage_structure',
    {
      title: 'Gerenciar estrutura',
      description:
        'Cria, renomeia ou remove projeto, contexto, tag, área ou meta. Remover e mesclar tag exigem confirm_token.',
      inputSchema: {
        entity: ENTITY,
        action: z.enum(['create', 'update', 'delete', 'merge_tag']),
        name: z.string().optional(),
        target: z.union([z.string(), z.number()]).optional(),
        into: z.union([z.string(), z.number()]).optional(),
        fields: z.record(z.string(), z.unknown()).optional(),
        confirm_token: z.string().optional()
      }
    },
    async (args) => {
      if (args.action === 'create') {
        if (!args.name) return fail('validation', 'Informe name para criar.')
        const name = args.name

        switch (args.entity) {
          case 'project': {
            const created = createProject(buildProjectCreateInput(name, args.fields))
            broadcastRefresh()
            return ok({ created })
          }
          case 'context': {
            const created = createContext(
              name,
              strField(args.fields, 'icon'),
              strField(args.fields, 'color')
            )
            broadcastRefresh()
            return ok({ created })
          }
          case 'tag': {
            const created = createTag(name, strField(args.fields, 'color'))
            broadcastRefresh()
            return ok({ created })
          }
          case 'area': {
            const created = createArea(buildAreaCreateInput(name, args.fields))
            broadcastRefresh()
            return ok({ created })
          }
          case 'goal': {
            const horizon = numField(args.fields, 'horizon')
            if (horizon !== 3 && horizon !== 4 && horizon !== 5) {
              return fail('validation', 'Informe fields.horizon (3, 4 ou 5) para criar meta.')
            }
            const input: CreateGoalInput = {
              name,
              description: strField(args.fields, 'description'),
              horizon,
              area_id: numField(args.fields, 'area_id')
            }
            const created = createGoal(input)
            broadcastRefresh()
            return ok({ created })
          }
        }
      }

      const rows = listEntityRows(args.entity)

      if (args.action === 'merge_tag') {
        if (args.entity !== 'tag') return fail('validation', 'merge_tag só vale para entity=tag.')
        if (!args.target) return fail('validation', 'Informe target com a tag de origem.')
        if (!args.into) return fail('validation', 'Informe into com a tag de destino.')

        const from = resolveByName(rows, args.target)
        if (!from.ok) {
          return fail(from.code, 'Tag de origem não encontrada ou ambígua.', {
            candidates: from.candidates
          })
        }
        const into = resolveByName(rows, args.into)
        if (!into.ok) {
          return fail(into.code, 'Tag de destino não encontrada ou ambígua.', {
            candidates: into.candidates
          })
        }

        const operation = { kind: 'merge_tags', payload: { from: from.id, into: into.id } }
        if (!args.confirm_token) {
          return fail(
            'needs_confirmation',
            'Mesclar tags é irreversível. Confirme com o usuário.',
            {
              confirm_token: ctx.confirmStore.issue(operation),
              preview: {
                from: rows.find((row) => row.id === from.id),
                into: rows.find((row) => row.id === into.id)
              }
            }
          )
        }
        const consumed = ctx.confirmStore.consume(args.confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)

        const affected = mergeTags(from.id, into.id)
        afterTagChange(affected)
        broadcastRefresh()
        return ok({ merged: { from: from.id, into: into.id } })
      }

      if (!args.target) return fail('validation', 'Informe target.')
      const target = resolveByName(rows, args.target)
      if (!target.ok) {
        return fail(target.code, `${args.entity} não encontrado ou ambíguo.`, {
          candidates: target.candidates
        })
      }
      const targetId = target.id

      if (args.action === 'update') {
        switch (args.entity) {
          case 'project': {
            const patch = buildProjectUpdatePatch(args.name, args.fields)
            if (Object.keys(patch).length === 0) {
              return fail('validation', 'Informe name ou fields para atualizar.')
            }
            updateProject(targetId, patch)
            break
          }
          case 'context': {
            const patch = buildContextUpdatePatch(args.name, args.fields)
            if (Object.keys(patch).length === 0) {
              return fail('validation', 'Informe name ou fields para atualizar.')
            }
            updateContext(targetId, patch)
            break
          }
          case 'tag': {
            const patch = buildTagUpdatePatch(args.name, args.fields)
            if (Object.keys(patch).length === 0) {
              return fail('validation', 'Informe name ou fields para atualizar.')
            }
            updateTag(targetId, patch)
            break
          }
          case 'area': {
            const patch = buildAreaUpdatePatch(args.name, args.fields)
            if (Object.keys(patch).length === 0) {
              return fail('validation', 'Informe name ou fields para atualizar.')
            }
            updateArea(targetId, patch)
            break
          }
          case 'goal': {
            const patch = buildGoalUpdatePatch(args.name, args.fields)
            if (Object.keys(patch).length === 0) {
              return fail('validation', 'Informe name ou fields para atualizar.')
            }
            updateGoal(targetId, patch)
            break
          }
        }
        broadcastRefresh()
        return ok({ updated: targetId })
      }

      const operation = { kind: 'delete_structure', payload: { entity: args.entity, id: targetId } }
      if (!args.confirm_token) {
        return fail(
          'needs_confirmation',
          `Remover ${args.entity} é permanente. Confirme com o usuário.`,
          {
            confirm_token: ctx.confirmStore.issue(operation),
            preview: rows.find((row) => row.id === targetId)
          }
        )
      }
      const consumed = ctx.confirmStore.consume(args.confirm_token, operation)
      if (!consumed.ok) return fail(consumed.code, consumed.message)

      const affectedByTagDeletion = args.entity === 'tag' ? listTaskIdsWithTag(targetId) : []

      switch (args.entity) {
        case 'project':
          deleteProject(targetId)
          break
        case 'context':
          deleteContext(targetId)
          break
        case 'tag':
          deleteTag(targetId)
          break
        case 'area':
          deleteArea(targetId)
          break
        case 'goal':
          deleteGoal(targetId)
          break
      }
      if (args.entity === 'tag') afterTagChange(affectedByTagDeletion)
      broadcastRefresh()
      return ok({ deleted: targetId })
    }
  )
}
