import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScrollArea } from '@renderer/components/ui/scroll-area'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { SearchableSelect } from '@renderer/components/ui/searchable-select'
import { ColorPicker } from '@renderer/components/ColorPicker'
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { useTags } from '@renderer/hooks/useTags'
import { toast } from '@renderer/components/ui/sonner'
import { ArrowLeft, Merge, Pencil, Plus, Tag as TagIcon, Trash2 } from 'lucide-react'
import type { TagWithUsage } from '@shared/types'

const DEFAULT_TAG_COLOR = '#6366f1'

function usageLabel(count: number): string {
  if (count === 0) return 'não usada'
  return `em ${count} ${count === 1 ? 'tarefa' : 'tarefas'}`
}

export function TagsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { tags, loading, createTag, updateTag, mergeTags, deleteTag } = useTags()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_TAG_COLOR)
  const [deleteTarget, setDeleteTarget] = useState<TagWithUsage | null>(null)
  const [mergeSource, setMergeSource] = useState<TagWithUsage | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [saving, setSaving] = useState(false)

  const openCreateDialog = (): void => {
    setEditId(null)
    setName('')
    setColor(DEFAULT_TAG_COLOR)
    setDialogOpen(true)
  }

  const openEditDialog = (tag: TagWithUsage): void => {
    setEditId(tag.id)
    setName(tag.name)
    setColor(tag.color)
    setDialogOpen(true)
  }

  const mergeOptions = useMemo(
    () =>
      tags
        .filter((tag) => tag.id !== mergeSource?.id)
        .map((tag) => ({
          value: String(tag.id),
          label: `${tag.name} (${usageLabel(tag.task_count)})`
        })),
    [tags, mergeSource]
  )

  const handleSubmit = useCallback(
    async (event: React.FormEvent): Promise<void> => {
      event.preventDefault()
      if (!name.trim()) return

      setSaving(true)
      try {
        if (editId) {
          await updateTag(editId, { name: name.trim(), color })
          toast.success('Tag atualizada')
        } else {
          await createTag(name.trim(), color)
          toast.success('Tag criada')
        }
        setDialogOpen(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível salvar a tag')
      } finally {
        setSaving(false)
      }
    },
    [name, color, editId, createTag, updateTag]
  )

  const handleDelete = useCallback(async (): Promise<void> => {
    if (!deleteTarget) return
    try {
      await deleteTag(deleteTarget.id)
      toast.success('Tag removida')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível remover a tag')
    } finally {
      setDeleteTarget(null)
    }
  }, [deleteTarget, deleteTag])

  const handleMerge = useCallback(async (): Promise<void> => {
    if (!mergeSource || !mergeTargetId) return

    setSaving(true)
    try {
      const affected = await mergeTags(mergeSource.id, Number(mergeTargetId))
      toast.success(
        affected === 0
          ? 'Tags mescladas'
          : `Tags mescladas — ${affected} ${affected === 1 ? 'tarefa atualizada' : 'tarefas atualizadas'}`
      )
      setMergeSource(null)
      setMergeTargetId('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível mesclar as tags')
    } finally {
      setSaving(false)
    }
  }, [mergeSource, mergeTargetId, mergeTags])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      <header className="shrink-0 px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="pl-0 text-slate-500 hover:text-slate-900 hover:bg-transparent"
          >
            <ArrowLeft size={18} className="mr-2" /> Voltar
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <TagIcon size={20} className="text-slate-700" />
          <h1 className="text-lg font-bold text-slate-900">Tags</h1>
        </div>
        <Button
          size="sm"
          onClick={openCreateDialog}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Tag
        </Button>
      </header>

      <div className="px-6 pt-4">
        <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 text-sm text-blue-700">
          Tags nascem enquanto você digita nas tarefas, então variações de grafia acabam virando
          tags diferentes. <strong>Mesclar</strong> move as tarefas de uma tag para outra e descarta
          a primeira.
        </div>
      </div>

      <ScrollArea className="flex-1 h-0">
        <div className="p-6 pt-4 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <p>Carregando...</p>
            </div>
          ) : tags.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <TagIcon size={32} />
              </div>
              <p>Nenhuma tag cadastrada.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="bg-white border border-slate-200 rounded-sm p-4 transition-all group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{tag.name}</p>
                        <p className="text-xs text-slate-500">{usageLabel(tag.task_count)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditDialog(tag)}
                        title="Editar"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setMergeSource(tag)
                          setMergeTargetId('')
                        }}
                        title="Mesclar em outra tag"
                        disabled={tags.length < 2}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-40"
                      >
                        <Merge size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(tag)}
                        title="Excluir"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar tag' : 'Nova tag'}</DialogTitle>
            <DialogDescription>
              {editId
                ? 'O novo nome vale para todas as tarefas que já usam esta tag.'
                : 'Escolha um nome e uma cor.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Nome</label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="urgente"
                autoFocus
              />
            </div>
            <ColorPicker value={color} onChange={setColor} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!name.trim() || saving}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mergeSource !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMergeSource(null)
            setMergeTargetId('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mesclar &quot;{mergeSource?.name}&quot;</DialogTitle>
            <DialogDescription>
              As {mergeSource ? usageLabel(mergeSource.task_count) : ''} passam para a tag
              escolhida, e &quot;{mergeSource?.name}&quot; deixa de existir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Mesclar em</label>
            <SearchableSelect
              value={mergeTargetId}
              onChange={setMergeTargetId}
              options={mergeOptions}
              placeholder="Selecione a tag que fica..."
              searchPlaceholder="Buscar tag..."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMergeSource(null)
                setMergeTargetId('')
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleMerge} disabled={!mergeTargetId || saving}>
              Mesclar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Excluir "${deleteTarget?.name}"?`}
        description={
          deleteTarget?.task_count
            ? `A tag sai de ${deleteTarget.task_count} ${
                deleteTarget.task_count === 1 ? 'tarefa' : 'tarefas'
              }. As tarefas em si não são afetadas.`
            : 'Esta tag não está em nenhuma tarefa.'
        }
      />
    </div>
  )
}
