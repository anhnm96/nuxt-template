import OrderedList from '@tiptap/extension-ordered-list'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customOrderedList: {
      /**
       * Toggle a bullet list with a specified class name
       */
      toggleOrderedClass: (className: string) => ReturnType
    }
  }
}

const CustomOrderedList = OrderedList.extend({
  name: 'customOrderedList',
  // Set the default class
  addAttributes() {
    return {
      class: {
        default: 'list-decimal',
      },
    }
  },

  // Add command to toggle class name
  addCommands() {
    return {
      // @ts-expect-error parent is not recognized by TypeScript
      ...this.parent?.(),
      toggleOrderedClass:
        (className: string) =>
          ({ commands, chain }: { commands: any, chain: any }) => {
            // @ts-expect-error - editor access is safe but not recognized by TypeScript
            if (!this.editor.isActive(this.name)) {
              return chain().toggleOrderedList().updateAttributes(this.name, {
                class: className,
              })
            }

            // @ts-expect-error - editor access is safe but not recognized by TypeScript
            if (!this.editor.isActive(this.name, { class: className })) {
              return commands.updateAttributes(this.name, {
                class: className,
              })
            }

            return true
          },
    }
  },
})

export default CustomOrderedList
