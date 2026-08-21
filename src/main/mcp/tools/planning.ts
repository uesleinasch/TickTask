import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import {
  createTimeBlock,
  createWeeklyReview,
  deleteTimeBlock,
  getLastWeeklyReview,
  getReviewHealthIndicators,
  getTask,
  getTasksForDate,
  getTimeBlock,
  getTimeBlocksForDate,
  getTimeBlocksForMonth,
  getTimeBlocksForWeek,
  getWeeklyReview,
  getWeeklySchedule,
  listWeeklyReviews,
  updateDayOrder,
  updateTask,
  updateWeeklyReview
} from '../../database'
import { needsConfirmation } from '../confirmGuard'
import { afterTaskWrite, broadcastRefresh } from '../effects'
import { fail, ok } from '../reply'
import type { ToolContext } from '../toolContext'

export function registerPlanningTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    'agenda',
    {
      title: 'Agenda',
      description: 'Tasks agendadas e blocos de tempo de um dia, semana ou mês.',
      inputSchema: {
        range: z.enum(['day', 'week', 'month']),
        date: z
          .string()
          .describe('Data de referência: AAAA-MM-DD (para range=month, AAAA-MM também vale)')
      }
    },
    async ({ range, date }) => {
      if (range === 'day') {
        return ok({ date, tasks: getTasksForDate(date), time_blocks: getTimeBlocksForDate(date) })
      }
      if (range === 'week') {
        return ok({
          date,
          schedule: getWeeklySchedule(date),
          time_blocks: getTimeBlocksForWeek(date)
        })
      }
      const yearMonth = date.slice(0, 7)
      return ok({ date: yearMonth, time_blocks: getTimeBlocksForMonth(yearMonth) })
    }
  )

  server.registerTool(
    'plan_day',
    {
      title: 'Planejar o dia',
      description: `Agenda tasks numa data, ordena o dia e cria ou remove blocos de tempo. Acima de ${ctx.bulkThreshold} itens alterados de uma vez exige confirm_token.`,
      inputSchema: {
        schedule: z
          .array(
            z.object({
              task_id: z.number().int().positive(),
              date: z.union([z.string(), z.null()]),
              order: z.number().int().min(0).optional()
            })
          )
          .optional(),
        create_blocks: z
          .array(
            z.object({
              task_id: z.number().int().positive(),
              date: z.string(),
              start_time: z.string(),
              end_time: z.string()
            })
          )
          .optional(),
        delete_block_ids: z.array(z.number().int().positive()).optional(),
        confirm_token: z.string().optional()
      }
    },
    async ({ schedule, create_blocks, delete_block_ids, confirm_token }) => {
      const scheduleItems = schedule ?? []
      const blocks = create_blocks ?? []
      const removals = delete_block_ids ?? []

      if (scheduleItems.length === 0 && blocks.length === 0 && removals.length === 0) {
        return fail('validation', 'Informe schedule, create_blocks ou delete_block_ids.')
      }

      const referencedTaskIds = [
        ...scheduleItems.map((item) => item.task_id),
        ...blocks.map((block) => block.task_id)
      ]
      const missingTasks = [...new Set(referencedTaskIds.filter((id) => !getTask(id)))]
      if (missingTasks.length > 0) {
        return fail('not_found', `Tasks inexistentes: ${missingTasks.join(', ')}.`)
      }

      const missingBlocks = removals.filter((id) => !getTimeBlock(id))
      if (missingBlocks.length > 0) {
        return fail('not_found', `Blocos de tempo inexistentes: ${missingBlocks.join(', ')}.`)
      }

      const touched = scheduleItems.length + blocks.length + removals.length
      const operation = {
        kind: 'plan_day',
        payload: { schedule: scheduleItems, create_blocks: blocks, delete_block_ids: removals }
      }

      if (needsConfirmation('plan_day', touched, ctx.bulkThreshold)) {
        if (!confirm_token) {
          return fail(
            'needs_confirmation',
            `Esta operação mexe em ${touched} itens do planejamento. Mostre o preview ao usuário e repita a chamada com o confirm_token.`,
            {
              confirm_token: ctx.confirmStore.issue(operation),
              preview: {
                schedule: scheduleItems.map((item) => ({
                  task_id: item.task_id,
                  name: getTask(item.task_id)?.name,
                  date: item.date
                })),
                create_blocks: blocks,
                delete_block_ids: removals
              }
            }
          )
        }
        const consumed = ctx.confirmStore.consume(confirm_token, operation)
        if (!consumed.ok) return fail(consumed.code, consumed.message)
      }

      for (const item of scheduleItems) {
        updateTask(item.task_id, { scheduled_date: item.date })
        if (item.order !== undefined) updateDayOrder(item.task_id, item.order)
        afterTaskWrite(item.task_id)
      }

      const created = blocks.map((block) =>
        createTimeBlock({
          task_id: block.task_id,
          date: block.date,
          start_time: block.start_time,
          end_time: block.end_time
        })
      )
      removals.forEach((id) => deleteTimeBlock(id))
      if (blocks.length > 0 || removals.length > 0) broadcastRefresh()

      return ok({
        scheduled: scheduleItems.map((item) => item.task_id),
        created_blocks: created,
        deleted_blocks: removals
      })
    }
  )

  server.registerTool(
    'weekly_review',
    {
      title: 'Revisão semanal',
      description:
        'Lê as revisões anteriores e os indicadores de saúde, ou registra uma nova revisão.',
      inputSchema: {
        action: z.enum(['status', 'list', 'create']),
        notes: z.string().optional()
      }
    },
    async ({ action, notes }) => {
      if (action === 'status') {
        return ok({ last: getLastWeeklyReview(), health: getReviewHealthIndicators() })
      }
      if (action === 'list') {
        return ok({ reviews: listWeeklyReviews() })
      }

      const review = createWeeklyReview()
      if (notes) updateWeeklyReview(review.id, { notes })
      broadcastRefresh()
      return ok({ created: notes ? getWeeklyReview(review.id) : review })
    }
  )
}
