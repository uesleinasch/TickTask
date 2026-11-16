/** Rota que o clique numa menção abre; null para o que não tem tela própria (contexto). */
export function mentionRoute(entityType: unknown, id: unknown): string | null {
  const n = Number(id)
  if (!Number.isInteger(n) || n <= 0) return null
  switch (entityType) {
    case 'task':
      return `/task/${n}`
    case 'project':
      return `/project/${n}`
    case 'page':
      return `/notebooks?page=${n}`
    default:
      return null
  }
}
