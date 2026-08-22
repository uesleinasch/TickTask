import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  addManualTimeEntry,
  getActiveTimeEntry,
  getGeneralStats,
  getTask,
  getTaskTimeStats,
  getTimeEntries,
  getWeeklyStats,
  listRunningTasks,
  startTask,
  stopTask
} from '../../database'
import { afterTaskWrite } from '../effects'
import { fail, ok } from '../reply'

export function registerTimerTools(server: McpServer): void {
  server.registerTool(
    'timer',
    {
      title: 'Controlar o timer',
      description:
        'Inicia ou para o timer de uma task, mostra o que está rodando, ou lança tempo manualmente.',
      inputSchema: {
        action: z.enum(['start', 'stop', 'status', 'add_manual_time']),
        task_id: z.number().int().positive().optional(),
        minutes: z.number().int().positive().optional()
      }
    },
    async ({ action, task_id, minutes }) => {
      if (action === 'status') {
        return ok({ running: listRunningTasks() })
      }

      if (task_id === undefined) {
        return fail('validation', 'Informe task_id para esta ação.')
      }
      if (!getTask(task_id)) {
        return fail('not_found', `Task ${task_id} não existe.`)
      }

      if (action === 'start') {
        if (getActiveTimeEntry(task_id)) {
          return fail('app_state', `A task ${task_id} já tem timer rodando.`)
        }
        startTask(task_id)
        afterTaskWrite(task_id)
        return ok({ started: task_id })
      }

      if (action === 'stop') {
        if (!getActiveTimeEntry(task_id)) {
          return fail('app_state', `A task ${task_id} não tem timer rodando.`)
        }
        stopTask(task_id)
        afterTaskWrite(task_id)
        return ok({ stopped: task_id, entries: getTimeEntries(task_id) })
      }

      if (minutes === undefined) {
        return fail('validation', 'Informe minutes para lançar tempo manual.')
      }
      addManualTimeEntry(task_id, minutes * 60)
      afterTaskWrite(task_id)
      return ok({ added_minutes: minutes, task_id })
    }
  )

  server.registerTool(
    'time_report',
    {
      title: 'Relatório de tempo',
      description: 'Tempo gasto: geral, por semana, por task, ou os registros de uma task.',
      inputSchema: {
        scope: z.enum(['general', 'weekly', 'by_task', 'task_entries']),
        task_id: z.number().int().positive().optional()
      }
    },
    async ({ scope, task_id }) => {
      if (scope === 'general') return ok(getGeneralStats())
      if (scope === 'weekly') return ok(getWeeklyStats())
      if (scope === 'by_task') return ok(getTaskTimeStats())

      if (task_id === undefined) {
        return fail('validation', 'Informe task_id para scope=task_entries.')
      }
      if (!getTask(task_id)) return fail('not_found', `Task ${task_id} não existe.`)
      return ok({ task_id, entries: getTimeEntries(task_id) })
    }
  )
}
