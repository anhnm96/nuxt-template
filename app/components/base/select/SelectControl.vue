<script setup lang="ts">
/**
 * The control box: wrapper, trigger, clear button, chevron.
 *
 * The clear button is a *sibling* of the trigger, never a child — `Button.vue` renders a
 * real `<button>`, and a nested button is invalid HTML that the parser reparents.
 */
defineOptions({ inheritAttrs: false })

const props = defineProps<{
  id: string
  listboxId: string
  isOpen: boolean
  searchable?: boolean
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  loading?: boolean
  /**
   * The popup cannot be opened right now (loading with nothing to show). Announced as
   * `aria-disabled`, never as the native `disabled` attribute — the control must stay
   * focusable so a keyboard user can land on it and hear that it is not ready.
   */
  blocked?: boolean
  /** Whether the clear button should be rendered at all. */
  canClear?: boolean
  /** A Value is set but its Item has not arrived yet. */
  resolving?: boolean
  activeDescendantId?: string
  clearLabel?: string
}>()

/**
 * Deliberately no `toggle`: Dropdown's trigger wrapper already toggles on click and this
 * click bubbles into it. A second toggle from here closes the popover the instant it opens —
 * only under a real mouse gesture, which runs a microtask checkpoint between the two
 * listeners so Vue flushes in between. Scripted clicks never show it.
 */
const emit = defineEmits<{ clear: [] }>()

const attrs = useAttrs()

/**
 * The clear button is out of the Tab order on purpose: one stop per filled Select adds up
 * fast on a form with nine of them. `tabindex="-1"` keeps it in the accessibility tree, so a
 * screen reader still reaches it by virtual cursor — and `Delete`/`Backspace` on the closed
 * trigger is the keyboard path, which makes that shortcut load-bearing rather than a
 * convenience. This names it on hover, since the button is no longer reachable by Tab.
 */
const clearTitle = computed(() => `${props.clearLabel} (Delete)`)

/**
 * `class`/`style` describe the control's box; everything else (`id`, `aria-*`, `data-*`,
 * listeners) belongs on the focusable trigger. Vue cannot split these for us, and getting
 * it wrong fails silently — `aria-labelledby` on a div announces nothing.
 */
const wrapperAttrs = computed(() => {
  const { class: className, style } = attrs
  return { class: className, style }
})

const triggerAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

/**
 * Open is not enough: the popup swaps the listbox out for a spinner while it is blocked, and
 * `blocked` can arrive *after* opening — a refetch that empties `items` leaves the popover up,
 * because Dropdown only gates opening. An `aria-controls` pointing at an id that resolves to
 * nothing is worse than no relationship at all.
 */
const listboxIsRendered = computed(() => props.isOpen && !props.blocked)

/**
 * When searchable, the search input inside the popup is the combobox and owns
 * `aria-activedescendant`; the trigger is then only a disclosure button.
 */
const triggerAria = computed(() => props.searchable
  ? { 'aria-haspopup': 'listbox' as const }
  : {
      'role': 'combobox',
      'aria-haspopup': 'listbox' as const,
      'aria-controls': listboxIsRendered.value ? props.listboxId : undefined,
      'aria-activedescendant': listboxIsRendered.value ? props.activeDescendantId : undefined,
    })
</script>

<template>
  <div
    class="select-control"
    :class="[
      invalid && 'invalid',
      disabled && 'disabled',
      canClear && 'has-clear',
    ]"
    data-slot="select-control"
    v-bind="wrapperAttrs"
  >
    <button
      :id="id"
      type="button"
      class="select-trigger"
      :disabled="disabled"
      :aria-expanded="isOpen"
      :aria-invalid="invalid || undefined"
      :aria-required="required || undefined"
      :aria-busy="loading || undefined"
      :aria-disabled="blocked || undefined"
      :aria-keyshortcuts="canClear ? 'Delete' : undefined"
      v-bind="{ ...triggerAttrs, ...triggerAria }"
      data-slot="select-trigger"
    >
      <span
        class="flex min-w-0 flex-1 items-center gap-1 truncate text-left"
        :class="[resolving && 'animate-pulse opacity-50']"
      >
        <slot />
      </span>
    </button>

    <button
      v-if="canClear"
      type="button"
      tabindex="-1"
      class="select-clear"
      :aria-label="clearLabel"
      :title="clearTitle"
      :disabled="disabled"
      data-slot="clear"
      @click.stop="emit('clear')"
    >
      <Icon class="shrink-0" size="16" name="ph:x-circle" />
    </button>

    <span class="select-indicator" aria-hidden="true">
      <Spinner v-if="loading" class="text-sm" />
      <Icon v-else size="16" name="mdi:chevron-down" :class="[isOpen && 'rotate-180']" />
    </span>
  </div>
</template>
