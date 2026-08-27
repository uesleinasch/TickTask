export const HIDDEN_FLAG = '--hidden'

export function shouldStartHidden(argv: readonly string[]): boolean {
  return argv.includes(HIDDEN_FLAG)
}
