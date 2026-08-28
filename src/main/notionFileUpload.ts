import type { Client } from '@notionhq/client'
import { promises as fs } from 'fs'
import path from 'path'

/** Sobe um arquivo (single-part) e retorna o file_upload id anexável. */
export async function uploadImageToNotion(
  client: Client,
  filePath: string,
  mime: string,
  filename: string
): Promise<string> {
  const name = filename || path.basename(filePath)
  const created = await client.fileUploads.create({
    mode: 'single_part',
    filename: name,
    content_type: mime
  })
  const buffer = await fs.readFile(filePath)
  await client.fileUploads.send({
    file_upload_id: created.id,
    file: { filename: name, data: new Blob([buffer], { type: mime }) }
  })
  return created.id
}
