import { createRoot, type Root } from 'react-dom/client'
import { createElement, type ComponentType } from 'react'
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion'

export interface PopupComponentProps<T> extends SuggestionProps<T> {
  registerKeyHandler: (fn: (e: KeyboardEvent) => boolean) => void
}

/** Cria os callbacks render() do Suggestion, renderizando `Component` num popup posicionado. */
export function createSuggestionRenderer<T>(Component: ComponentType<PopupComponentProps<T>>) {
  return () => {
    let el: HTMLDivElement | null = null
    let root: Root | null = null
    let keyHandler: ((e: KeyboardEvent) => boolean) | null = null

    const position = (rect: DOMRect | null): void => {
      if (!el || !rect) return
      el.style.left = `${rect.left}px`
      el.style.top = `${rect.bottom + 6}px`
    }

    const render = (props: SuggestionProps<T>): void => {
      if (!root || !el) return
      root.render(
        createElement(Component, {
          ...props,
          registerKeyHandler: (fn) => {
            keyHandler = fn
          }
        })
      )
      position(props.clientRect?.() ?? null)
    }

    return {
      onStart: (props: SuggestionProps<T>) => {
        el = document.createElement('div')
        el.style.position = 'fixed'
        el.style.zIndex = '9999'
        document.body.appendChild(el)
        root = createRoot(el)
        render(props)
      },
      onUpdate: (props: SuggestionProps<T>) => render(props),
      onKeyDown: (props: SuggestionKeyDownProps) => {
        if (props.event.key === 'Escape') return false
        return keyHandler ? keyHandler(props.event) : false
      },
      onExit: () => {
        root?.unmount()
        el?.remove()
        el = null
        root = null
        keyHandler = null
      }
    }
  }
}
