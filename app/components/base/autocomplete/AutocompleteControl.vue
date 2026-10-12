<script setup lang="ts">
/**
 * The control box: wrapper, input, clear button, chevron.
 *
 * Unlike `SelectControl` the input is the Trigger *and* the combobox — there is no second
 * field inside the popup, so `role="combobox"` never moves. See CONTEXT.md — Trigger.
 */
defineOptions({ inheritAttrs: false })

defineProps<{
  id: string
  listboxId: string
  query: string
  isOpen: boolean
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  loading?: boolean
  /** Whether the clear button should be rendered at all. */
  canClear?: boolean
  /**
   * Whether the popup is currently rendering the listbox. It is not, while the Query is below
   * a longer Query or the first load is still running — and an `aria-controls` pointing at
   * an id that resolves to nothing is worse than no relationship at all.
   */
  listboxIsRendered?: boolean
  activeDescendantId?: string
  clearLabel?: string
  toggleLabel?: string
}>()

const emit = defineEmits<{
  input: [value: string]
  clear: []
  /** The chevron: the only pointer gesture that may *close* the popup. */
  toggle: []
  /** The input itself: opens, never closes, so a click can place the caret. */
  open: []
  blur: []
}>()

const attrs = useAttrs()

/**
 * `class`/`style` describe the control's box; everything else (`aria-*`, `data-*`, listeners)
 * belongs on the focusable input. Vue cannot split these for us, and getting it wrong fails
 * silently — `aria-labelledby` on a div announces nothing.
 */
const wrapperAttrs = computed(() => {
  const { class: className, style } = attrs
  return { class: className, style }
})

const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

/**
 * Opening a filled field selects the text, so the next keystroke replaces the Label rather
 * than appending to it — `Japan` + `x` filters to nothing, and the user would have to empty
 * the field by hand before searching. Exposed rather than done here: only the parent knows
 * whether a Value is set.
 */
function selectAll() {
  inputRef.value?.select()
}

defineExpose({ inputRef, focus: () => inputRef.value?.focus(), selectAll })
</script>

<template>
  <div
    class="select-control"
    :class="[
      invalid && 'invalid',
      disabled && 'disabled',
      canClear && 'has-clear',
    ]"
    data-slot="autocomplete-control"
    :data-autocomplete="id"
    v-bind="wrapperAttrs"
  >
    <!--
      `inputAttrs` is spread *first* so the attributes below win. `Dropdown` merges
      `data-slot="dropdown-trigger"` and `aria-haspopup="true"` onto whatever it is given, and
      with `inheritAttrs: false` here that lands on this input — silently replacing the
      combobox's own `data-slot` and narrowing `listbox` to `true`. `SelectControl` orders its
      trigger the same way, for the same reason.
    -->
    <input
      :id="id"
      ref="inputRef"
      v-bind="inputAttrs"
      type="text"
      role="combobox"
      class="autocomplete-input"
      :value="query"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      autocomplete="off"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      :aria-controls="listboxIsRendered ? listboxId : undefined"
      :aria-activedescendant="listboxIsRendered ? activeDescendantId : undefined"
      :aria-invalid="invalid || undefined"
      :aria-required="required || undefined"
      :aria-busy="loading || undefined"
      data-slot="autocomplete-input"
      @input="emit('input', ($event.target as HTMLInputElement).value)"
      @click="emit('open')"
      @blur="emit('blur')"
    >

    <!--
      Out of the Tab order, as Select's is: one stop per filled field adds up fast on a long
      form. Select backs that up with `Delete`/`Backspace` on its closed trigger; here those
      keys edit text, and the keyboard path is select-all then `Delete`, which empties the
      Query and clears the Value through the (A) invariant.
    -->
    <button
      v-if="canClear"
      type="button"
      tabindex="-1"
      class="select-clear"
      :aria-label="clearLabel"
      :title="clearLabel"
      :disabled="disabled"
      data-slot="clear"
      @mousedown.prevent
      @click.stop="emit('clear')"
    >
      <Icon class="shrink-0" size="16" name="ph:x-circle" />
    </button>

    <!-- chevron -->
    <button
      type="button"
      tabindex="-1"
      class="select-indicator autocomplete-indicator"
      :aria-label="toggleLabel"
      :aria-expanded="isOpen"
      :aria-controls="listboxIsRendered ? listboxId : undefined"
      :disabled="disabled"
      data-slot="autocomplete-toggle"
      @mousedown.prevent
      @click.stop="emit('toggle')"
    >
      <Spinner v-if="loading" class="text-sm" />
      <Icon v-else size="16" name="mdi:chevron-down" :class="[isOpen && 'rotate-180']" />
    </button>
  </div>
</template>
