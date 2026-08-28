// Janelas auxiliares carregam o mesmo bundle da principal (HashRouter sobre file://).
// Sem esta guarda, cada uma sobe sua própria cópia do cronômetro e disputa o float.
const AUXILIARY_ROUTES = ['#/float', '#/quick-capture']

export function shouldBootstrapTimerStore(hash: string): boolean {
  const route = hash.split('?')[0].replace(/\/$/, '')
  return !AUXILIARY_ROUTES.includes(route)
}
