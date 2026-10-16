<script setup lang="ts">
import { injectMenuContext } from './context'

/**
 * One row of a Menu: a command, or — when `checked` is bound — a Checked Item that reports
 * and sets a value its host already owns.
 *
 * Deliberately a `div`, not a `<button>`: a natively disabled button is unfocusable and
 * largely unannounced, where a menu wants a disabled row a screen reader can still find and
 * report as unavailable. `aria-disabled` gives that, and the keyboard skips the row either
 * way. See DESIGN.md — the Host-focuses-the-first-focusable collision that first drove this
 * choice no longer decides it, because the Menu takes focus itself on open.
 */
const props = withDefaults(defineProps<{
  disabled?: boolean
  /**
   * Binding this at all makes the row a Checked Item: the role becomes `menuitemradio` and
   * `aria-checked` is announced. Pass `false` for the unchecked rows of a set rather than
   * omitting it, or they are announced as plain commands.
   *
   * The `undefined` default is load-bearing. Vue resolves an *absent* `Boolean` prop to
   * `false` unless a default is declared, which would make every command row a radio
   * reporting "not checked". `Menu.spec.ts` guards it, because the failure is silent.
   * The same casting rule is recorded in ADR-0002.
   */
  checked?: boolean
  /** Matched by Typeahead. Defaults to the row's own trimmed text. */
  label?: string
}>(), {
  checked: undefined,
  label: undefined,
})

const emit = defineEmits<{ select: [] }>()

const menu = injectMenuContext()

const isCheckable = computed(() => props.checked !== undefined)

function activate() {
  if (props.disabled) return
  // The consumer acts first; dismissal unmounts this row.
  emit('select')
  menu.onItemActivate()
}

/**
 * Hovering moves real focus, so arrowing after pointing continues from where the pointer
 * is. `mousemove` rather than `mouseenter`, and guarded: a Menu that opens under a
 * stationary cursor must not grab focus before the user has moved anything.
 */
function handleMouseMove(event: MouseEvent) {
  if (props.disabled) return
  const el = event.currentTarget as HTMLElement
  if (document.activeElement !== el) el.focus()
}
</script>

<template>
  <div
    :role="isCheckable ? 'menuitemradio' : 'menuitem'"
    tabindex="-1"
    class="menu-item"
    :aria-disabled="disabled || undefined"
    :aria-checked="checked"
    :data-label="label"
    :data-checked="checked || undefined"
    :data-disabled="disabled || undefined"
    data-slot="menu-item"
    @click="activate"
    @keydown.enter.prevent="activate"
    @keydown.space.prevent="activate"
    @mousemove="handleMouseMove"
    @mousedown.prevent
  >
    <!-- check gutter -->
    <span v-if="isCheckable" class="menu-item-check" aria-hidden="true">
      <Icon v-if="checked" size="14" name="ph:check-bold" />
    </span>
    <slot :checked="checked" :disabled="disabled">
      <span class="truncate">{{ label }}</span>
    </slot>
  </div>
</template>
