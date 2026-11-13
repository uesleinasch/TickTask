import type { JiraField, JiraFieldInput, JiraFieldOption, JiraFieldView } from '@shared/types'
import { adfToPlainText, plainTextToAdf, type DocNode } from './jiraAdf'

export interface EditMetaField {
  name: string
  required?: boolean
  operations?: string[]
  schema?: { type?: string; items?: string; system?: string; custom?: string }
  allowedValues?: Record<string, unknown>[]
}

export interface RawIssueWithMeta {
  fields: Record<string, unknown>
  editmeta?: { fields?: Record<string, EditMetaField> }
}

const HIDDEN_FIELDS = new Set([
  'description',
  'issuetype',
  'project',
  'attachment',
  'issuelinks',
  'comment',
  'worklog',
  'timetracking',
  'parent',
  'status'
])

const ADF_TEXT_FIELDS = new Set(['environment'])
const ADF_TEXT_CUSTOM = /:textarea$/

export function isSprintField(meta: EditMetaField): boolean {
  return /:gh-sprint$/.test(meta.schema?.custom ?? '')
}

function optionLabel(value: Record<string, unknown>): string {
  return String(value.value ?? value.name ?? value.displayName ?? value.id ?? '')
}

function toOption(value: Record<string, unknown>): JiraFieldOption {
  return { id: String(value.id), label: optionLabel(value) }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(', ')
  const record = asRecord(value)
  if (!record) return String(value)
  if (record.type === 'doc') return adfToPlainText(record as unknown as DocNode)
  return optionLabel(record)
}

function currentSprint(value: unknown): { id: number; name: string } | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const sprints = value.map(asRecord).filter((s): s is Record<string, unknown> => !!s)
  const open = sprints.filter((s) => s.state !== 'closed')
  const pick = open[open.length - 1] ?? sprints[sprints.length - 1]
  return pick ? { id: Number(pick.id), name: String(pick.name ?? pick.id) } : null
}

function viewFor(
  meta: EditMetaField,
  value: unknown,
  sprintOptions: JiraFieldOption[],
  id: string
): JiraFieldView {
  const schema = meta.schema ?? {}
  const allowed = meta.allowedValues
  const canSet = !meta.operations || meta.operations.includes('set')
  if (!canSet) return { kind: 'readonly', value: displayValue(value) }

  if (isSprintField(meta)) {
    const sprint = currentSprint(value)
    const options = [...sprintOptions]
    if (sprint && !options.some((o) => o.id === String(sprint.id))) {
      options.unshift({ id: String(sprint.id), label: sprint.name })
    }
    return { kind: 'sprint', value: sprint?.id ?? null, options }
  }
  if (schema.type === 'array' && allowed) {
    const selected = Array.isArray(value) ? value.map(asRecord).filter(Boolean) : []
    return {
      kind: 'multiselect',
      value: selected.map((v) => String(v?.id)),
      options: allowed.map(toOption)
    }
  }
  if (schema.type === 'array' && schema.items === 'string') {
    return { kind: 'labels', value: Array.isArray(value) ? value.map(String) : [] }
  }
  if (allowed && schema.type !== 'array') {
    const record = asRecord(value)
    return {
      kind: 'select',
      value: record?.id !== undefined ? String(record.id) : null,
      options: allowed.map(toOption)
    }
  }
  switch (schema.type) {
    case 'string': {
      const isAdf = ADF_TEXT_FIELDS.has(id) || ADF_TEXT_CUSTOM.test(schema.custom ?? '')
      if (isAdf) {
        const doc = asRecord(value)
        return { kind: 'text', value: doc ? adfToPlainText(doc as unknown as DocNode) : null }
      }
      return { kind: 'string', value: typeof value === 'string' ? value : null }
    }
    case 'number':
      return { kind: 'number', value: typeof value === 'number' ? value : null }
    case 'date':
      return { kind: 'date', value: typeof value === 'string' ? value.slice(0, 10) : null }
    case 'datetime':
      return { kind: 'datetime', value: typeof value === 'string' ? value : null }
    case 'user': {
      const user = asRecord(value)
      return {
        kind: 'user',
        value: user?.accountId
          ? { accountId: String(user.accountId), displayName: String(user.displayName ?? '') }
          : null
      }
    }
    default:
      return { kind: 'readonly', value: displayValue(value) }
  }
}

const SYSTEM_ORDER = ['summary', 'assignee', 'priority', 'duedate', 'labels']

export function describeIssueFields(
  issue: RawIssueWithMeta,
  sprintOptions: JiraFieldOption[] = []
): JiraField[] {
  const meta = issue.editmeta?.fields ?? {}
  const fields = Object.entries(meta)
    .filter(([id]) => !HIDDEN_FIELDS.has(id))
    .map(
      ([id, field]): JiraField => ({
        id,
        name: field.name,
        required: field.required ?? false,
        ...viewFor(field, issue.fields[id], sprintOptions, id)
      })
    )
  const rank = (id: string): number => {
    const i = SYSTEM_ORDER.indexOf(id)
    return i === -1 ? SYSTEM_ORDER.length : i
  }
  return fields.sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, 'pt-BR'))
}

function jiraDateTime(input: string): string {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) throw new Error(`Data inválida: ${input}`)
  return date.toISOString().replace('Z', '+0000')
}

const blank = (input: JiraFieldInput): boolean =>
  input === null || input === '' || (Array.isArray(input) && input.length === 0)

export function toJiraValue(field: JiraField, input: JiraFieldInput): unknown {
  switch (field.kind) {
    case 'string':
      return blank(input) ? null : String(input)
    case 'text':
      return blank(input) ? null : plainTextToAdf(String(input))
    case 'number': {
      if (blank(input)) return null
      const n = Number(input)
      if (!Number.isFinite(n)) throw new Error(`${field.name}: informe um número.`)
      return n
    }
    case 'date':
      return blank(input) ? null : String(input).slice(0, 10)
    case 'datetime':
      return blank(input) ? null : jiraDateTime(String(input))
    case 'select':
      return blank(input) ? null : { id: String(input) }
    case 'multiselect':
      return (Array.isArray(input) ? input : []).map((id) => ({ id: String(id) }))
    case 'labels':
      return (Array.isArray(input) ? input : []).map((l) => String(l).trim().replace(/\s+/g, '_'))
    case 'user':
      return blank(input) ? null : { accountId: String(input) }
    case 'sprint':
      return blank(input) ? null : Number(input)
    case 'readonly':
      throw new Error(`${field.name} não pode ser editado pelo TickTask.`)
  }
}
