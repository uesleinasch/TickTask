import Mention from '@tiptap/extension-mention'
import { createSuggestionRenderer } from '../suggestionPopup'
import { MentionList, type MentionEntry } from './MentionList'

export const MentionExtension = Mention.extend({
  addAttributes() {
    return {
      id: { default: null },
      label: { default: null },
      entityType: { default: null }
    }
  }
}).configure({
  HTMLAttributes: { class: 'mention' },
  renderText({ node }) {
    return `@${node.attrs.label ?? ''}`
  },
  suggestion: {
    char: '@',
    items: async ({ query }): Promise<MentionEntry[]> => {
      const res = await window.api.searchMentions(query)
      return res as MentionEntry[]
    },
    command: ({ editor, range, props }) => {
      const entry = props as unknown as MentionEntry
      editor
        .chain()
        .focus()
        .insertContentAt(range, [
          { type: 'mention', attrs: { id: entry.id, label: entry.label, entityType: entry.type } },
          { type: 'text', text: ' ' }
        ])
        .run()
    },
    render: createSuggestionRenderer<MentionEntry>(MentionList)
  }
})
