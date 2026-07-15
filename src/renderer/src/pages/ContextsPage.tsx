import { useState, useCallback } from 'react'
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
import { DeleteConfirmDialog } from '@renderer/components/DeleteConfirmDialog'
import { useContexts } from '@renderer/hooks/useContexts'
import { ArrowLeft, Plus, MapPin, Pencil, Trash2 } from 'lucide-react'
import { toast } from '@renderer/components/ui/sonner'

const CONTEXT_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1',
  '#ef4444', '#84cc16'
]

const CONTEXT_ICONS = [
  '💻', '📱', '👥', '📧', '📖', '🛒', '🏠', '🏢',
  '🚗', '🏋️', '☎️', '📝', '🎯', '💬', '🔧', '📋'
]

export function ContextsPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { contexts, loading, createContext, updateContext, deleteContext } = useContexts()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('📋')
  const [color, setColor] = useState('#3b82f6')

  const resetForm = (): void => {
    setName('')
    setIcon('📋')
    setColor('#3b82f6')
    setEditId(null)
  }

  const openCreateDialog = (): void => {
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (ctx: { id: number; name: string; icon: string; color: string }): void => {
    setEditId(ctx.id)
    setName(ctx.name)
    setIcon(ctx.icon)
    setColor(ctx.color)
    setDialogOpen(true)
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault()
      if (!name.trim()) return

      if (editId) {
        await updateContext(editId, { name: name.trim(), icon, color })
        toast.success('Contexto atualizado')
      } else {
        await createContext(name.trim(), icon, color)
        toast.success('Contexto criado')
      }
      resetForm()
      setDialogOpen(false)
    },
    [name, icon, color, editId, createContext, updateContext]
  )

  const handleDelete = useCallback(async (): Promise<void> => {
    if (deleteId) {
      await deleteContext(deleteId)
      toast.success('Contexto removido')
      setDeleteId(null)
    }
  }, [deleteId, deleteContext])

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
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
          <MapPin size={20} className="text-slate-700" />
          <h1 className="text-lg font-bold text-slate-900">Contextos</h1>
        </div>
        <Button
          size="sm"
          onClick={openCreateDialog}
          className="bg-slate-900 text-white hover:bg-slate-800"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Contexto
        </Button>
      </header>

      {/* Info */}
      <div className="px-6 pt-4">
        <div className="bg-blue-50 border border-blue-200 rounded-sm p-4 text-sm text-blue-700">
          <strong>Contextos GTD</strong> definem <em>onde</em> ou <em>com o que</em> uma ação pode
          ser executada. Filtre suas tarefas por contexto para ver o que fazer agora, dado seu
          ambiente atual.
        </div>
      </div>

      {/* Context List */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-6 pt-4 pb-24">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <p>Carregando...</p>
            </div>
          ) : contexts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <div className="bg-slate-100 p-4 rounded-full mb-4">
                <MapPin size={32} />
              </div>
              <p>Nenhum contexto cadastrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {contexts.map((ctx) => (
                <div
                  key={ctx.id}
                  className="bg-white border border-slate-200 rounded-sm p-4 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: ctx.color + '20' }}
                      >
                        {ctx.icon}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{ctx.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditDialog(ctx)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteId(ctx.id)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-white rounded-sm shadow-2xl border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editId ? 'Editar Contexto' : 'Novo Contexto'}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Contextos definem onde ou com o que uma ação pode ser executada.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="ctx-name" className="text-sm font-medium text-slate-700">
                Nome *
              </label>
              <Input
                id="ctx-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: @computador"
                required
                className="border-slate-300 focus:ring-slate-900"
              />
            </div>

            {/* Icon Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {CONTEXT_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                      icon === ic
                        ? 'bg-slate-900 ring-2 ring-slate-900 ring-offset-2'
                        : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Cor</label>
              <div className="flex flex-wrap gap-2">
                {CONTEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                style={{ backgroundColor: color + '20' }}
              >
                {icon}
              </div>
              <span className="font-medium text-slate-900">{name || 'Nome do contexto'}</span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!name.trim()}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {editId ? 'Salvar' : 'Criar Contexto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        onConfirm={handleDelete}
      />
    </div>
  )
}
