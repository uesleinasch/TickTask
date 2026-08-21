import type { ConfirmStore } from './confirmGuard'

export interface ToolContext {
  confirmStore: ConfirmStore
  bulkThreshold: number
}
