import { createHash, randomUUID } from 'crypto'

export type GuardedKind =
  | 'delete_tasks'
  | 'delete_structure'
  | 'merge_tags'
  | 'replace_notes'
  | 'bulk_update_tasks'
  | 'plan_day'

export interface PendingOperation {
  kind: string
  payload: unknown
}

const ALWAYS_CONFIRM: GuardedKind[] = [
  'delete_tasks',
  'delete_structure',
  'merge_tags',
  'replace_notes'
]

export function needsConfirmation(
  kind: GuardedKind,
  itemCount: number,
  threshold: number
): boolean {
  if (ALWAYS_CONFIRM.includes(kind)) return true
  // Falha fechado: contagem inválida (NaN, negativa) não pode desligar a confirmação
  // silenciosamente — o custo de confirmar demais é aceitável, o de não confirmar não é.
  if (!Number.isFinite(itemCount) || itemCount < 0) return true
  return itemCount > threshold
}

function fingerprint(op: PendingOperation): string {
  return createHash('sha256')
    .update(`${op.kind}:${JSON.stringify(op.payload)}`)
    .digest('hex')
}

export interface ConfirmStore {
  issue(op: PendingOperation): string
  consume(
    token: string,
    op: PendingOperation
  ): { ok: true } | { ok: false; code: 'invalid_token'; message: string }
}

export function createConfirmStore(options?: {
  ttlMs?: number
  now?: () => number
  makeId?: () => string
}): ConfirmStore {
  const ttlMs = options?.ttlMs ?? 5 * 60 * 1000
  const now = options?.now ?? Date.now
  const makeId = options?.makeId ?? randomUUID
  const pending = new Map<string, { hash: string; expiresAt: number }>()

  function pruneExpired(): void {
    const currentTime = now()
    for (const [token, entry] of pending) {
      if (entry.expiresAt < currentTime) pending.delete(token)
    }
  }

  return {
    issue(op) {
      pruneExpired()
      const token = makeId()
      pending.set(token, { hash: fingerprint(op), expiresAt: now() + ttlMs })
      return token
    },
    consume(token, op) {
      const entry = pending.get(token)
      if (!entry) {
        return {
          ok: false,
          code: 'invalid_token',
          message: 'Confirmação inválida. Repita a operação para ver o preview de novo.'
        }
      }
      // Uso único: o token é descartado já na primeira tentativa de consumo,
      // mesmo que ela falhe adiante (expirado ou operação divergente).
      pending.delete(token)
      if (entry.expiresAt < now()) {
        return {
          ok: false,
          code: 'invalid_token',
          message: 'Confirmação expirada. Repita a operação para ver o preview de novo.'
        }
      }
      // O hash amarra o token à operação exata: sem isso, um token emitido para
      // "deletar 1 e 2" poderia ser reaproveitado para deletar "1 e 3".
      if (entry.hash !== fingerprint(op)) {
        return {
          ok: false,
          code: 'invalid_token',
          message:
            'A confirmação não corresponde a esta operação. Repita a operação para ver o preview de novo.'
        }
      }
      return { ok: true }
    }
  }
}
