import path from 'path'

export const DEV_USER_DATA_DIR = 'ticktask-dev'

export interface UserDataOverrideSource {
  isPackaged: boolean
  env: Record<string, string | undefined>
  appData: string
}

/**
 * Pasta de dados que substitui a padrão: TICKTASK_USER_DATA, se definida; senão, fora do app
 * empacotado, uma pasta própria de dev. Com a mesma pasta, o dev cairia na trava de instância
 * única (que é por pasta) e fecharia — ou mexeria nos dados reais.
 */
export function resolveUserDataOverride(source: UserDataOverrideSource): string | null {
  const explicit = source.env.TICKTASK_USER_DATA?.trim()
  if (explicit) return path.resolve(explicit)
  if (!source.isPackaged) return path.join(source.appData, DEV_USER_DATA_DIR)
  return null
}
