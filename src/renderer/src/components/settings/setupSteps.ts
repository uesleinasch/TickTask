export interface StepDefinition {
  id: string
  autoDone?: boolean
}

export interface ResolvedStep {
  id: string
  done: boolean
  current: boolean
  manual: boolean
}

export function resolveSteps(steps: StepDefinition[], doneIds: string[]): ResolvedStep[] {
  const resolved = steps.map((step) => ({
    id: step.id,
    manual: step.autoDone === undefined,
    done: step.autoDone ?? doneIds.includes(step.id),
    current: false
  }))
  const current = resolved.find((step) => !step.done)
  if (current) current.current = true
  return resolved
}

export function toggleStepDone(doneIds: string[], id: string): string[] {
  return doneIds.includes(id) ? doneIds.filter((done) => done !== id) : [...doneIds, id]
}
