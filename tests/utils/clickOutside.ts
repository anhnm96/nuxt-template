import type { ObjectDirective } from 'vue'
import clickOutsidePlugin from '../../app/plugins/clickOutside'

/**
 * The real `v-click-outside` directive, for `global.directives` in a mount.
 *
 * The plugin registers the directive on the app, so this runs the plugin against a fake app
 * and takes the directive back out. Exporting the directive from the plugin only for tests
 * would add a second entry point to keep in step.
 */
export function realClickOutside(): ObjectDirective {
  const registered: Record<string, ObjectDirective> = {}
  ;(clickOutsidePlugin as any)({
    vueApp: {
      directive: (name: string, def: ObjectDirective) => {
        registered[name] = def
      },
    },
  })
  return registered.clickOutside!
}
