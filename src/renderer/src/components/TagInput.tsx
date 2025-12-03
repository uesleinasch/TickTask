import { useState, useEffect, useRef, KeyboardEvent, ReactElement } from 'react'
import { X } from 'lucide-react'
import type { Tag } from '@shared/types'
import { cn } from '@renderer/lib/utils'

interface TagInputProps {
  selectedTags: Tag[]
  onChange: (tags: Tag[]) => void
  placeholder?: string
  className?: string
}

export function TagInput({
  selectedTags,
  onChange,
  placeholder = 'Digite e pressione Enter...',
  className
}: TagInputProps): ReactElement {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Carregar todas as tags disponíveis
  useEffect(() => {
    loadTags()
  }, [])

  // Filtrar sugestões quando o usuário digita
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = allTags.filter(
        (tag) =>
          tag.name.toLowerCase().includes(inputValue.toLowerCase()) &&
          !selectedTags.some((st) => st.id === tag.id)
      )
      setSuggestions(filtered)
      setShowSuggestions(true)
      setHighlightedIndex(-1)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [inputValue, allTags, selectedTags])

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadTags(): Promise<void> {
    try {
      const tags = await window.api.listTags()
      setAllTags(tags)
    } catch (error) {
      console.error('Erro ao carregar tags:', error)
    }
  }

  async function addTag(tagName: string): Promise<void> {
    const trimmedName = tagName.trim()
    if (!trimmedName) return

    // Verificar se já existe uma tag com esse nome selecionada
    const alreadySelected = selectedTags.some(
      (t) => t.name.toLowerCase() === trimmedName.toLowerCase()
    )
    if (alreadySelected) {
      setInputValue('')
      return
    }

    try {
      // Usar getOrCreate para obter ou criar a tag
      const tag = await window.api.getOrCreateTag(trimmedName)

      // Atualizar lista de tags se foi criada nova
      if (!allTags.some((t) => t.id === tag.id)) {
        setAllTags((prev) => [...prev, tag])
      }

      onChange([...selectedTags, tag])
      setInputValue('')
      setShowSuggestions(false)
    } catch (error) {
      console.error('Erro ao adicionar tag:', error)
    }
  }

  function removeTag(tagId: number): void {
    onChange(selectedTags.filter((t) => t.id !== tagId))
  }

  function selectSuggestion(tag: Tag): void {
    onChange([...selectedTags, tag])
    setInputValue('')
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        selectSuggestion(suggestions[highlightedIndex])
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Remover última tag se input vazio
      removeTag(selectedTags[selectedTags.length - 1].id)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Container de tags e input */}
      <div
        className="flex flex-wrap gap-1.5 p-2 min-h-[42px] bg-slate-800/50 border border-slate-700 rounded-md focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Tags selecionadas */}
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeTag(tag.id)
              }}
              className="ml-0.5 hover:bg-white/20 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue.trim() && setShowSuggestions(true)}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-slate-200 placeholder:text-slate-500"
        />
      </div>

      {/* Dropdown de sugestões */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg overflow-hidden">
          {suggestions.map((tag, index) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => selectSuggestion(tag)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                index === highlightedIndex
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-700/50'
              )}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Mensagem para criar nova tag */}
      {showSuggestions && inputValue.trim() && suggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg overflow-hidden">
          <button
            type="button"
            onClick={() => addTag(inputValue)}
            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
          >
            Criar tag &ldquo;
            <span className="text-indigo-400 font-medium">{inputValue.trim()}</span>
            &rdquo;
          </button>
        </div>
      )}
    </div>
  )
}
