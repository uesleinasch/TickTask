import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type {
  CreateAreaInput,
  CreateGoalInput,
  CreateProjectInput,
  GoalHorizon,
  ProjectStatus,
  UpdateAreaInput,
  UpdateGoalInput,
  UpdateProjectInput,
  UpdateTagInput
} from '@shared/types'
import { z } from 'zod'
import {
  countTasks,
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

const PROJECT_FIELD_KEYS = ['description', 'outcome', 'status', 'color', 'due_date', 'area_id']
const CONTEXT_FIELD_KEYS = ['icon', 'color']
const TAG_FIELD_KEYS = ['color']
const AREA_FIELD_KEYS = ['description', 'icon']
const GOAL_FIELD_KEYS = ['description', 'horizon', 'area_id']
const PROJECT_STATUSES: ProjectStatus[] = ['active', 'someday', 'done', 'archived']

function unknownFieldsError(fields: Fields, allowed: string[]): ReturnType<typeof fail> | null {
  if (!fields) return null
  const unknown = Object.keys(fields).filter((key) => !allowed.includes(key))
  if (unknown.length === 0) return null
  return fail('validation', `Campo(s) desconhecido(s) em fields: ${unknown.join(', ')}.`)
}

function stringFieldTypeError(fields: Fields, key: string): ReturnType<typeof fail> | null {
  const value = fields?.[key]
  if (value !== undefined && typeof value !== 'string') {
    return fail('validation', `fields.${key} deve ser texto.`)
  }
  return null
}

function projectStatusError(fields: Fields): ReturnType<typeof fail> | null {
  const value = fields?.status
  if (value === undefined) return null
  if (typeof value !== 'string' || !PROJECT_STATUSES.includes(value as ProjectStatus)) {
    return fail('validation', `fields.status deve ser um de: ${PROJECT_STATUSES.join(', ')}.`)
  }
  return null
}

function goalHorizonError(fields: Fields): ReturnType<typeof fail> | null {
  const value = fields?.horizon
  if (value === undefined) return null
  if (value !== 3 && value !== 4 && value !== 5) {
    return fail('validation', 'fields.horizon deve ser 3, 4 ou 5.')
  }
  return null
}

function validateProjectFields(fields: Fields): ReturnType<typeof fail> | null {
  return (
    unknownFieldsError(fields, PROJECT_FIELD_KEYS) ??
    stringFieldTypeError(fields, 'description') ??
    stringFieldTypeError(fields, 'outcome') ??
    stringFieldTypeError(fields, 'color') ??
    stringFieldTypeError(fields, 'due_date') ??
    projectStatusError(fields)
  )
}

function validateContextFields(fields: Fields): ReturnType<typeof fail> | null {
  return (
    unknownFieldsError(fields, CONTEXT_FIELD_KEYS) ??
    stringFieldTypeError(fields, 'icon') ??
    stringFieldTypeError(fields, 'color')
  )
}

function validateTagFields(fields: Fields): ReturnType<typeof fail> | null {
  return unknownFieldsError(fields, TAG_FIELD_KEYS) ?? stringFieldTypeError(fields, 'color')
}

function validateAreaFields(fields: Fields): ReturnType<typeof fail> | null {
  return (
    unknownFieldsError(fields, AREA_FIELD_KEYS) ??
    stringFieldTypeError(fields, 'description') ??
    stringFieldTypeError(fields, 'icon')
  )
}

function validateGoalFields(fields: Fields): ReturnType<typeof fail> | null {
  return (
    unknownFieldsError(fields, GOAL_FIELD_KEYS) ??
    stringFieldTypeError(fields, 'description') ??
    goalHorizonError(fields)
  )
}

type AreaIdResolution =
  | { ok: true; value: number | undefined }
  | { ok: false; response: ReturnType<typeof fail> }

function resolveAreaId(fields: Fields): AreaIdResolution {
  const raw = fields?.area_id
  if (raw === undefined) return { ok: true, value: undefined }
  if (typeof raw === 'number') return { ok: true, value: raw }
  if (typeof raw === 'string') {
    const resolved = resolveByName(listAreas(), raw)
    if (!resolved.ok) {
      return {
        ok: false,
        response: fail(resolved.code, 'Área não encontrada ou ambígua.', {
          candidates: resolved.candidates
        })
      }
    }
    return { ok: true, value: resolved.id }
  }
  return { ok: false, response: fail('validation', 'fields.area_id deve ser number ou string.') }
}

type AreaIdOrNullResolution =
  | { ok: true; value: number | null | undefined }
  | { ok: false; response: ReturnType<typeof fail> }

function resolveAreaIdOrNull(fields: Fields): AreaIdOrNullResolution {
  if (fields?.area_id === null) return { ok: true, value: null }
  return resolveAreaId(fields)
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message)
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

function buildProjectCreateInput(
  name: string,
  fields: Fields,
  areaId: number | undefined
): CreateProjectInput {
  return {
    name,
    description: strField(fields, 'description'),
    outcome: strField(fields, 'outcome'),
    status: strField(fields, 'status') as ProjectStatus | undefined,
    color: strField(fields, 'color'),
    due_date: strField(fields, 'due_date'),
    area_id: areaId
  }
}

function buildProjectUpdatePatch(
  name: string | undefined,
  fields: Fields,
  areaId: number | null | undefined
): UpdateProjectInput {
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

function buildGoalUpdatePatch(
  name: string | undefined,
  fields: Fields,
  areaId: number | null | undefined
): UpdateGoalInput {
  const patch: UpdateGoalInput = {}
  if (name !== undefined) patch.name = name
  const description = strField(fields, 'description')
  if (description !== undefined) patch.description = description
  const horizon = numField(fields, 'horizon')
  if (horizon !== undefined) patch.horizon = horizon as GoalHorizon
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

function deleteConfirmationMessage(
  entity: Entity,
  targetId: number,
  row: EntityRow | undefined
): string {
  const label = row?.name ?? `#${targetId}`
  // task_contexts tem ON DELETE CASCADE: apagar o contexto desvincula essas tasks dele.
  if (entity === 'context') {
    const affected = countTasks({ contextId: targetId })
    return `Remover o contexto "${label}" é permanente e desvincula ${affected} task(s) dele; elas continuam existindo, apenas sem esse contexto. Confirme com o usuário.`
  }
  // FK de project_id é ON DELETE SET NULL: as tasks sobrevivem, mas ficam sem projeto.
  if (entity === 'project') {
    const affected = listProjects().find((project) => project.id === targetId)?.task_count ?? 0
    return `Remover o projeto "${label}" é permanente; ${affected} task(s) desse projeto ficam sem projeto (project_id passa a nulo). Confirme com o usuário.`
  }
  return `Remover ${entity} é permanente. Confirme com o usuário.`
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
            const fieldsError = validateProjectFields(args.fields)
            if (fieldsError) return fieldsError
            const areaResolved = resolveAreaId(args.fields)
            if (!areaResolved.ok) return areaResolved.response
            const created = createProject(
              buildProjectCreateInput(name, args.fields, areaResolved.value)
            )
            broadcastRefresh()
            return ok({ created })
          }
          case 'context': {
            const fieldsError = validateContextFields(args.fields)
            if (fieldsError) return fieldsError
            let created
            try {
              created = createContext(
                name,
                strField(args.fields, 'icon'),
                strField(args.fields, 'color')
              )
            } catch (error) {
              if (!isUniqueConstraintError(error)) throw error
              return fail('validation', `Já existe um contexto chamado "${name}".`)
            }
            broadcastRefresh()
            return ok({ created })
          }
          case 'tag': {
            const fieldsError = validateTagFields(args.fields)
            if (fieldsError) return fieldsError
            let created
            try {
              created = createTag(name, strField(args.fields, 'color'))
            } catch (error) {
              if (!isUniqueConstraintError(error)) throw error
              return fail('validation', `Já existe uma tag chamada "${name}".`)
            }
            broadcastRefresh()
            return ok({ created })
          }
          case 'area': {
            const fieldsError = validateAreaFields(args.fields)
            if (fieldsError) return fieldsError
            const created = createArea(buildAreaCreateInput(name, args.fields))
            broadcastRefresh()
            return ok({ created })
          }
          case 'goal': {
            const fieldsError = validateGoalFields(args.fields)
            if (fieldsError) return fieldsError
            const horizon = numField(args.fields, 'horizon')
            if (horizon !== 3 && horizon !== 4 && horizon !== 5) {
              return fail('validation', 'Informe fields.horizon (3, 4 ou 5) para criar meta.')
            }
            const areaResolved = resolveAreaId(args.fields)
            if (!areaResolved.ok) return areaResolved.response
            const input: CreateGoalInput = {
              name,
              description: strField(args.fields, 'description'),
              horizon,
              area_id: areaResolved.value
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
            const fieldsError = validateProjectFields(args.fields)
            if (fieldsError) return fieldsError
            const areaResolved = resolveAreaIdOrNull(args.fields)
            if (!areaResolved.ok) return areaResolved.response
            const patch = buildProjectUpdatePatch(args.name, args.fields, areaResolved.value)
            if (Object.keys(patch).length === 0) {
              return fail('validation', 'Informe name ou fields para atualizar.')
            }
            updateProject(targetId, patch)
            break
          }
          case 'context': {
            const fieldsError = validateContextFields(args.fields)
            if (fieldsError) return fieldsError
            const patch = buildContextUpdatePatch(args.name, args.fields)
            if (Object.keys(patch).length === 0) {
              return fail('validation', 'Informe name ou fields para atualizar.')
            }
            try {
              updateContext(targetId, patch)
            } catch (error) {
              if (!isUniqueConstraintError(error)) throw error
              return fail('validation', `Já existe um contexto chamado "${patch.name}".`)
            }
            break
          }
          case 'tag': {
            const fieldsError = validateTagFields(args.fields)
            if (fieldsError) return fieldsError
            const patch = buildTagUpdatePatch(args.name, args.fields)
            if (Object.keys(patch).length === 0) {
              return fail('validation', 'Informe name ou fields para atualizar.')
            }
            try {
              updateTag(targetId, patch)
            } catch (error) {
              if (!(error instanceof Error)) throw error
              return fail('validation', error.message)
            }
            break
          }
          case 'area': {
            const fieldsError = validateAreaFields(args.fields)
            if (fieldsError) return fieldsError
            const patch = buildAreaUpdatePatch(args.name, args.fields)
            if (Object.keys(patch).length === 0) {
              return fail('validation', 'Informe name ou fields para atualizar.')
            }
            updateArea(targetId, patch)
            break
          }
          case 'goal': {
            const fieldsError = validateGoalFields(args.fields)
            if (fieldsError) return fieldsError
            const areaResolved = resolveAreaIdOrNull(args.fields)
            if (!areaResolved.ok) return areaResolved.response
            const patch = buildGoalUpdatePatch(args.name, args.fields, areaResolved.value)
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
        const previewRow = rows.find((row) => row.id === targetId)
        return fail(
          'needs_confirmation',
          deleteConfirmationMessage(args.entity, targetId, previewRow),
          {
            confirm_token: ctx.confirmStore.issue(operation),
            preview: previewRow
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
