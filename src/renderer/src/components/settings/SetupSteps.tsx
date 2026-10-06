import { useState } from 'react'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { usePersistedState } from '@renderer/hooks/usePersistedState'
import { cn } from '@renderer/lib/utils'
import { resolveSteps, toggleStepDone } from './stepProgress'

export interface SetupStep {
  id: string
  title: string
  autoDone?: boolean
  content?: React.ReactNode
}

export function SetupSteps({
  storageKey,
  steps
}: {
  storageKey: string
  steps: SetupStep[]
}): React.JSX.Element {
  const [doneIds, setDoneIds] = usePersistedState<string[]>(storageKey, [])
  const [expanded, setExpanded] = useState<string[]>([])
  const resolved = resolveSteps(steps, doneIds)

  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const state = resolved[index]
        const isLast = index === steps.length - 1
        const open = !state.done || expanded.includes(step.id)
        return (
          <li key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold',
                  state.done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : state.current
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-500'
                )}
              >
                {state.done ? <Check size={13} strokeWidth={3} /> : index + 1}
              </span>
              {!isLast && <span className="w-0.5 flex-1 bg-slate-200 my-1" />}
            </div>

            <div className={cn('min-w-0 flex-1', isLast ? 'pb-1' : 'pb-5')}>
              <button
                type="button"
                disabled={!state.done}
                onClick={() =>
                  setExpanded((prev) =>
                    prev.includes(step.id)
                      ? prev.filter((id) => id !== step.id)
                      : [...prev, step.id]
                  )
                }
                className={cn(
                  'flex items-center gap-1 text-left text-sm font-medium leading-6 disabled:cursor-default',
                  state.done ? 'text-slate-500 hover:text-slate-700' : 'text-slate-900'
                )}
              >
                {state.done && (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />)}
                {step.title}
              </button>

              {open && (
                <div className="mt-1 text-sm text-slate-600 space-y-2">
                  {step.content}
                  {state.manual && (
                    <button
                      type="button"
                      onClick={() => setDoneIds(toggleStepDone(doneIds, step.id))}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline"
                    >
                      {state.done ? 'Desmarcar' : 'Marcar como feito'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
