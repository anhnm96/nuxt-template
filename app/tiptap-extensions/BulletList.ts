import BulletList from '@tiptap/extension-bullet-list'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customBulletList: {
      /**
       * Toggle a bullet list with a specified class name
       */
      toggleBulletClass: (className: string) => ReturnType
    }
  }
}

const CustomBulletList = BulletList.extend({
  name: 'customBulletList',
  // Set the default class
  addAttributes() {
    return {
      class: {
        default: 'list-disc',
      },
    }
  },

  // Add command to toggle class name
  addCommands() {
    return {
      // @ts-expect-error parent is not recognized by TypeScript
      ...this.parent?.(),
      toggleBulletClass:
        (className: string) =>
          ({ commands, chain }: { commands: any, chain: any }) => {
            // @ts-expect-error - editor access is safe but not recognized by TypeScript
            if (!this.editor.isActive(this.name)) {
              return chain().toggleBulletList().updateAttributes(this.name, {
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

export default CustomBulletList
