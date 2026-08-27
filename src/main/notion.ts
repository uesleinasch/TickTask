import { Client } from '@notionhq/client'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import type { Task, Tag } from '@shared/types'
import { drawingPreviewPath } from './drawingAssets'
import {
  collectImageAssetIds,
  notesToNotionBlocks,
  type ImageResolver,
  type NotionBlock
} from './notionBlocks'
import { getNoteAsset, setNoteAssetUpload } from './database'
import { uploadImageToNotion } from './notionFileUpload'
import { getAssetFilePath } from './notesAssets'

// Caminho do arquivo de configuração
const configPath = path.join(app.getPath('userData'), 'notion-config.json')

// O file_upload do Notion expira ~1h após a criação; renovamos com folga.
const UPLOAD_TTL_MS = 55 * 60 * 1000

// Interface de configuração do Notion
export interface NotionConfig {
  apiKey: string
  pageId?: string // Agora é opcional - será criado automaticamente
  databaseId?: string
  autoSync: boolean
  lastSync?: string
}

// Tipos de cor do Notion
type NotionColor =
  | 'default'
  | 'gray'
  | 'brown'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'red'

// Mapeamento de status
const STATUS_MAP: Record<string, string> = {
  inbox: 'Inbox',
  aguardando: 'Aguardando',
  proximas: 'Próximas',
  executando: 'Executando',
  finalizada: 'Finalizada'
}

// Mapeamento de categorias
const CATEGORY_MAP: Record<string, string> = {
  urgente: 'Urgente',
  prioridade: 'Prioridade',
  normal: 'Normal',
  time_leak: 'Time Leak'
}

let notionClient: Client | null = null
let currentConfig: NotionConfig | null = null

// ===================== CONFIGURAÇÃO =====================

export function loadNotionConfig(): NotionConfig | null {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8')
      currentConfig = JSON.parse(data)
      return currentConfig
    }
  } catch (error) {
    console.error('Erro ao carregar configuração do Notion:', error)
  }
  return null
}

export function saveNotionConfig(config: NotionConfig): void {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
    currentConfig = config
    // Reinicializar cliente com nova configuração
    if (config.apiKey) {
      notionClient = new Client({ auth: config.apiKey })
    }
  } catch (error) {
    console.error('Erro ao salvar configuração do Notion:', error)
    throw error
  }
}

export function getNotionConfig(): NotionConfig | null {
  if (!currentConfig) {
    loadNotionConfig()
  }
  return currentConfig
}

export function clearNotionConfig(): void {
  try {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath)
    }
    currentConfig = null
    notionClient = null
  } catch (error) {
    console.error('Erro ao limpar configuração do Notion:', error)
  }
}

// ===================== CLIENTE =====================

function getClient(): Client {
  if (!notionClient) {
    const config = getNotionConfig()
    if (!config || !config.apiKey) {
      throw new Error('Notion não está configurado. Configure a API Key nas configurações.')
    }
    notionClient = new Client({ auth: config.apiKey })
  }
  return notionClient
}

// ===================== BANCO DE DADOS =====================

// Buscar um database existente chamado "GTD APP" que a integração tenha acesso
// e que tenha as propriedades necessárias
async function findExistingDatabase(client: Client): Promise<string | null> {
  try {
    // Usar search sem filtro de tipo e verificar manualmente
    const response = await client.search({
      query: 'GTD APP'
    })

    for (const result of response.results) {
      // Verificar se é um database pelo objeto ou propriedades
      if ('object' in result) {
        const obj = result as {
          object: string
          id: string
          title?: Array<{ plain_text?: string }>
          properties?: Record<string, unknown>
        }
        if (obj.object === 'database' && obj.title) {
          const title = obj.title.map((t) => t.plain_text || '').join('')
          if (title === 'GTD APP') {
            // Verificar se tem as propriedades necessárias
            if (obj.properties && 'Nome' in obj.properties && 'ID Local' in obj.properties) {
              console.log('Database GTD APP válido encontrado:', obj.id)
              return obj.id
            } else {
              console.log('Database GTD APP encontrado mas sem propriedades corretas, ignorando...')
            }
          }
        }
      }
    }
    return null
  } catch (error) {
    console.log('Erro ao buscar database existente:', error)
    return null
  }
}

// Encontrar uma página que podemos usar como parent para criar o database
// A integração PRECISA ter sido conectada manualmente a pelo menos uma página
async function findAccessibleParentPage(client: Client): Promise<string> {
  const searchResponse = await client.search({
    filter: {
      property: 'object',
      value: 'page'
    },
    page_size: 10
  })

  if (searchResponse.results.length === 0) {
    throw new Error(
      'Nenhuma página acessível encontrada. Por favor, conecte a integração a pelo menos uma página no Notion ' +
        '(abra a página → menu ⋯ → Conexões → Adicionar sua integração).'
    )
  }

  // Preferir páginas que não são filhas de database (páginas normais)
  for (const result of searchResponse.results) {
    if ('parent' in result) {
      const parent = result.parent as { type: string }
      // Páginas com parent tipo "workspace" ou "page_id" são preferíveis
      if (parent.type === 'workspace' || parent.type === 'page_id') {
        console.log('Página acessível encontrada:', result.id)
        return result.id
      }
    }
  }

  // Se não encontrou página ideal, usar a primeira disponível
  const firstPage = searchResponse.results[0]
  console.log('Usando primeira página disponível:', firstPage.id)
  return firstPage.id
}

// Verificar se uma página específica está acessível
async function isPageAccessible(client: Client, pageId: string): Promise<boolean> {
  try {
    await client.pages.retrieve({ page_id: pageId })
    return true
  } catch {
    return false
  }
}

// Verificar se um database específico está acessível
async function isDatabaseAccessible(client: Client, databaseId: string): Promise<boolean> {
  try {
    await client.databases.retrieve({ database_id: databaseId })
    return true
  } catch {
    return false
  }
}

export async function createGTDDatabase(): Promise<string> {
  const client = getClient()
  const config = getNotionConfig()

  if (!config) {
    throw new Error('Notion não está configurado.')
  }

  try {
    // 1. Verificar se já existe um database "GTD APP" acessível via search
    const existingDb = await findExistingDatabase(client)
    if (existingDb) {
      console.log('Database GTD APP encontrado via search:', existingDb)
      const newConfig: NotionConfig = {
        ...config,
        databaseId: existingDb
      }
      saveNotionConfig(newConfig)
      return existingDb
    }

    // 2. Determinar qual página usar como parent
    let pageId = config.pageId

    // Se temos um pageId salvo, verificar se ainda está acessível
    if (pageId) {
      const accessible = await isPageAccessible(client, pageId)
      if (!accessible) {
        console.log('Página salva não está mais acessível, buscando nova...')
        pageId = undefined
        // Limpar pageId inválido da config
        const configWithoutPage: NotionConfig = {
          ...config,
          pageId: undefined,
          databaseId: undefined
        }
        saveNotionConfig(configWithoutPage)
      }
    }

    // 3. Se não temos pageId válido, encontrar uma página acessível
    if (!pageId) {
      pageId = await findAccessibleParentPage(client)

      // Salvar o pageId encontrado
      const configWithPage: NotionConfig = {
        ...config,
        pageId
      }
      saveNotionConfig(configWithPage)
    }

    // 4. Criar o banco de dados "GTD APP" dentro da página
    console.log('Criando database GTD APP na página:', pageId)

    const response = await client.databases.create({
      parent: {
        type: 'page_id',
        page_id: pageId
      },
      title: [
        {
          type: 'text',
          text: {
            content: 'GTD APP'
          }
        }
      ],
      icon: {
        type: 'emoji',
        emoji: '📋'
      },
      properties: {
        Nome: {
          title: {}
        },
        Descrição: {
          rich_text: {}
        },
        Status: {
          select: {
            options: [
              { name: 'Inbox', color: 'gray' },
              { name: 'Aguardando', color: 'yellow' },
              { name: 'Próximas', color: 'blue' },
              { name: 'Executando', color: 'green' },
              { name: 'Finalizada', color: 'purple' }
            ]
          }
        },
        Categoria: {
          select: {
            options: [
              { name: 'Urgente', color: 'red' },
              { name: 'Prioridade', color: 'orange' },
              { name: 'Normal', color: 'blue' },
              { name: 'Time Leak', color: 'yellow' }
            ]
          }
        },
        'Fonte/Tags': {
          multi_select: {
            options: []
          }
        },
        Contextos: {
          multi_select: {
            options: []
          }
        },
        Projeto: {
          select: {
            options: []
          }
        },
        'Tempo Total (min)': {
          number: {
            format: 'number'
          }
        },
        'Limite (min)': {
          number: {
            format: 'number'
          }
        },
        'Em Execução': {
          checkbox: {}
        },
        Arquivada: {
          checkbox: {}
        },
        'Criado em': {
          date: {}
        },
        'Atualizado em': {
          date: {}
        },
        'ID Local': {
          number: {
            format: 'number'
          }
        }
      }
    })

    // 5. Salvar database ID na configuração
    const finalConfig: NotionConfig = {
      ...config,
      pageId,
      databaseId: response.id
    }
    saveNotionConfig(finalConfig)

    console.log('Banco de dados GTD APP criado com sucesso:', response.id)
    return response.id
  } catch (error) {
    // Se o erro for "object_not_found", limpar a configuração para forçar nova busca
    if (error instanceof Error && error.message.includes('object_not_found')) {
      console.error('Página ou database não encontrado, limpando configuração...')
      const cleanConfig: NotionConfig = {
        apiKey: config.apiKey,
        autoSync: config.autoSync
      }
      saveNotionConfig(cleanConfig)
    }
    console.error('Erro ao criar banco de dados:', error)
    throw error
  }
}

export async function findOrCreateDatabase(): Promise<string> {
  const client = getClient()
  const config = getNotionConfig()

  // Se já temos um database ID, verificar se ainda está acessível
  if (config?.databaseId) {
    const accessible = await isDatabaseAccessible(client, config.databaseId)
    if (accessible) {
      return config.databaseId
    }

    // Database não está mais acessível, limpar e recriar
    console.log('Database salvo não está acessível, recriando...')
    const cleanConfig: NotionConfig = {
      apiKey: config.apiKey,
      autoSync: config.autoSync,
      pageId: config.pageId // Manter pageId para tentar usar
    }
    saveNotionConfig(cleanConfig)
  }

  // Criar novo banco de dados
  return createGTDDatabase()
}

// ===================== SINCRONIZAÇÃO =====================

function formatSecondsToMinutes(seconds: number): number {
  return Math.round(seconds / 60)
}

function getNotionColorForName(name: string): NotionColor {
  const colors: NotionColor[] = ['blue', 'green', 'orange', 'pink', 'purple', 'red', 'yellow']
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

function getNotionColorForTag(_tag: Tag): NotionColor {
  return getNotionColorForName(_tag.name)
}

// Garante que o database tenha as propriedades Contextos, Projeto e Tarefa Pai.
// Idempotente e com cache em memória; adiciona as que faltam (inclui databases já provisionados).
let schemaEnsuredFor: string | null = null

async function ensureNotionSchema(client: Client, databaseId: string): Promise<void> {
  if (schemaEnsuredFor === databaseId) return
  try {
    const db = await client.databases.retrieve({ database_id: databaseId })
    const props = (db as { properties?: Record<string, unknown> }).properties || {}
    const toAdd: Record<string, unknown> = {}
    if (!('Contextos' in props)) toAdd['Contextos'] = { multi_select: { options: [] } }
    if (!('Projeto' in props)) toAdd['Projeto'] = { select: { options: [] } }
    if (!('Tarefa Pai' in props)) {
      toAdd['Tarefa Pai'] = {
        relation: { database_id: databaseId, type: 'single_property', single_property: {} }
      }
    }
    if (Object.keys(toAdd).length > 0) {
      await client.databases.update({
        database_id: databaseId,
        properties: toAdd as Parameters<typeof client.databases.update>[0]['properties']
      })
      console.log('Schema do Notion atualizado (Contextos/Projeto/Tarefa Pai)')
    }
    schemaEnsuredFor = databaseId
  } catch (error) {
    console.error('Erro ao garantir schema do Notion:', error)
  }
}

export async function syncTaskToNotion(task: Task): Promise<string> {
  const client = getClient()
  const config = getNotionConfig()

  try {
    const databaseId = await findOrCreateDatabase()
    await ensureNotionSchema(client, databaseId)

    // Verificar se a tarefa já existe no Notion (pelo ID local)
    const existingPage = await findTaskInNotion(task.id)

    // Relação com a tarefa pai (subtarefas). Requer a pai já sincronizada.
    let parentRelation: Array<{ id: string }> = []
    if (task.parent_task_id) {
      const parentPageId = await findTaskInNotion(task.parent_task_id)
      if (parentPageId) {
        parentRelation = [{ id: parentPageId }]
      }
    }

    const properties = {
      Nome: {
        title: [
          {
            type: 'text',
            text: {
              content: task.name
            }
          }
        ]
      },
      Descrição: {
        rich_text: task.description
          ? [
              {
                type: 'text',
                text: {
                  content: task.description
                }
              }
            ]
          : []
      },
      Status: {
        select: {
          name: STATUS_MAP[task.status] || 'Inbox'
        }
      },
      Categoria: {
        select: {
          name: CATEGORY_MAP[task.category] || 'Normal'
        }
      },
      'Fonte/Tags': {
        multi_select:
          task.tags?.map((tag) => ({
            name: tag.name,
            color: getNotionColorForTag(tag)
          })) || []
      },
      Contextos: {
        multi_select:
          task.contexts?.map((ctx) => ({
            name: ctx.name,
            color: getNotionColorForName(ctx.name)
          })) || []
      },
      Projeto: task.project_name ? { select: { name: task.project_name } } : { select: null },
      'Tarefa Pai': {
        relation: parentRelation
      },
      'Tempo Total (min)': {
        number: formatSecondsToMinutes(task.total_seconds)
      },
      'Limite (min)': {
        number: task.time_limit_seconds ? formatSecondsToMinutes(task.time_limit_seconds) : null
      },
      'Em Execução': {
        checkbox: task.is_running
      },
      Arquivada: {
        checkbox: task.is_archived
      },
      'Criado em': {
        date: {
          start: task.created_at
        }
      },
      'Atualizado em': {
        date: {
          start: task.updated_at
        }
      },
      'ID Local': {
        number: task.id
      }
    }

    if (existingPage) {
      // Atualizar página existente
      const response = await client.pages.update({
        page_id: existingPage,
        properties: properties as Parameters<typeof client.pages.update>[0]['properties']
      })
      console.log('Tarefa atualizada no Notion:', task.name)
      return response.id
    } else {
      // Criar nova página
      const response = await client.pages.create({
        parent: {
          type: 'database_id',
          database_id: databaseId
        },
        properties: properties as Parameters<typeof client.pages.create>[0]['properties']
      })
      console.log('Tarefa criada no Notion:', task.name)
      return response.id
    }
  } catch (error) {
    // Se o erro for de validação (propriedades não existem), limpar a config do database
    if (
      error instanceof Error &&
      (error.message.includes('is not a property that exists') ||
        error.message.includes('validation_error'))
    ) {
      console.error(
        'Erro de validação - o database não tem as propriedades corretas. Limpando configuração...'
      )
      if (config) {
        saveNotionConfig({
          apiKey: config.apiKey,
          autoSync: config.autoSync,
          pageId: config.pageId
          // databaseId removido para forçar recriação
        })
      }
    }
    throw error
  }
}

/**
 * Reescreve o corpo da página do Notion da task com as notas ricas (Tiptap; aceita
 * também o formato legado Editor.js via dispatcher). Imagens sobem via File Upload API.
 * O Notion não tem "replace all children": listamos, deletamos e recriamos.
 */
async function buildDrawingBlock(client: Client, task: Task): Promise<NotionBlock | null> {
  if (!task.drawing) return null

  const filePath = drawingPreviewPath(task.id)
  if (!fs.existsSync(filePath)) return null

  try {
    const id = await uploadImageToNotion(client, filePath, 'image/png', `desenho-${task.id}.png`)
    return { object: 'block', type: 'image', image: { type: 'file_upload', file_upload: { id } } }
  } catch (error) {
    console.error('Falha ao subir o desenho para o Notion:', error)
    return null
  }
}

export async function syncTaskNotesToNotion(task: Task): Promise<void> {
  const client = getClient() // lança se Notion não configurado

  // Garante que a página existe e está com as properties atualizadas.
  await syncTaskToNotion(task)
  const pageId = await findTaskInNotion(task.id)
  if (!pageId) throw new Error('Não foi possível localizar a página da tarefa no Notion')

  // 1. Listar e deletar children atuais (paginando).
  let cursor: string | undefined = undefined
  const existingIds: string[] = []
  do {
    const res = await client.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100
    })
    for (const block of res.results) existingIds.push(block.id)
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  for (const blockId of existingIds) {
    try {
      await client.blocks.delete({ block_id: blockId })
    } catch (error) {
      console.error('Erro ao deletar bloco do Notion:', error)
    }
  }

  // 2a. Pré-passo: resolver imagens para file_upload ids (cache por asset, TTL ~1h).
  const now = Date.now()
  const assetIds = collectImageAssetIds(task.notes)
  const imageMap = new Map<string, string>()
  for (const assetId of assetIds) {
    const asset = getNoteAsset(assetId)
    if (!asset) continue
    const cacheValid =
      asset.notion_file_upload_id &&
      asset.notion_uploaded_at &&
      now - asset.notion_uploaded_at < UPLOAD_TTL_MS
    if (cacheValid && asset.notion_file_upload_id) {
      imageMap.set(assetId, asset.notion_file_upload_id)
      continue
    }
    const filePath = getAssetFilePath(assetId)
    if (!filePath) continue
    try {
      const fileUploadId = await uploadImageToNotion(client, filePath, asset.mime, asset.filename)
      setNoteAssetUpload(assetId, fileUploadId, now)
      imageMap.set(assetId, fileUploadId)
    } catch (error) {
      console.error('Falha ao subir imagem para o Notion:', error)
    }
  }
  const resolveImage: ImageResolver = (id) => imageMap.get(id) ?? null

  // 2b. Converter e adicionar os novos blocos (lotes de 100 — limite da API).
  const blocks = notesToNotionBlocks(task.notes, resolveImage)

  // O desenho entra ao final, como imagem. É reenviado a cada sync: o PNG é regravado a cada
  // save e não há asset id para servir de chave de cache, como acontece com as imagens da nota.
  const drawingBlock = await buildDrawingBlock(client, task)
  if (drawingBlock) blocks.push(drawingBlock)

  for (let i = 0; i < blocks.length; i += 100) {
    const batch = blocks.slice(i, i + 100)
    await client.blocks.children.append({
      block_id: pageId,
      children: batch as Parameters<typeof client.blocks.children.append>[0]['children']
    })
  }
}

export async function findTaskInNotion(localId: number): Promise<string | null> {
  const client = getClient()
  const config = getNotionConfig()

  if (!config?.databaseId) {
    return null
  }

  try {
    // Verificar se o database existe e está acessível
    const isAccessible = await isDatabaseAccessible(client, config.databaseId)
    if (!isAccessible) {
      console.log('Database não está acessível para buscar tarefa')
      return null
    }

    // Usar o método nativo do SDK para query do database
    const response = await client.databases.query({
      database_id: config.databaseId,
      filter: {
        property: 'ID Local',
        number: {
          equals: localId
        }
      }
    })

    if (response.results.length > 0) {
      return response.results[0].id
    }
  } catch (error) {
    console.error('Erro ao buscar tarefa no Notion:', error)
  }

  return null
}

export async function syncAllTasks(tasks: Task[]): Promise<{ success: number; failed: number }> {
  let success = 0
  let failed = 0

  for (const task of tasks) {
    try {
      await syncTaskToNotion(task)
      success++
    } catch (error) {
      console.error(`Erro ao sincronizar tarefa ${task.id}:`, error)
      failed++
    }
  }

  // Atualizar última sincronização
  const config = getNotionConfig()
  if (config) {
    saveNotionConfig({
      ...config,
      lastSync: new Date().toISOString()
    })
  }

  return { success, failed }
}

export async function deleteTaskFromNotion(localId: number): Promise<boolean> {
  const client = getClient()
  const pageId = await findTaskInNotion(localId)

  if (!pageId) {
    return false
  }

  try {
    await client.pages.update({
      page_id: pageId,
      archived: true
    })
    console.log('Tarefa arquivada no Notion:', localId)
    return true
  } catch (error) {
    console.error('Erro ao deletar tarefa do Notion:', error)
    return false
  }
}

// ===================== TESTE DE CONEXÃO =====================

export async function testNotionConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const client = getClient()
    const config = getNotionConfig()

    // Se tiver pageId, testar acesso à página
    if (config?.pageId) {
      try {
        await client.pages.retrieve({ page_id: config.pageId })
        return { success: true, message: 'Conexão bem-sucedida! Página acessível.' }
      } catch {
        // Page ID pode estar incorreto, mas API Key pode estar OK
      }
    }

    // Testar fazendo uma busca simples no workspace
    const searchResult = await client.search({ page_size: 1 })
    if (searchResult.results.length > 0) {
      return {
        success: true,
        message: 'Conexão bem-sucedida! API Key válida e workspace acessível.'
      }
    }

    return {
      success: true,
      message:
        'API Key válida, mas nenhuma página encontrada. Conecte a integração a pelo menos uma página.'
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return { success: false, message: `Falha na conexão: ${errorMessage}` }
  }
}

// Inicializar ao carregar o módulo
loadNotionConfig()
