<script lang="ts">
import type { AutocompleteAccessor, AutocompleteModel, AutocompleteOptionType } from './useAutocomplete'
import type { DropdownProps } from '~/components/base/dropdown/Dropdown.vue'
</script>

<script setup lang="ts" generic="I extends Record<string, any>, CK extends keyof I | ((item: I) => any[]) | undefined = undefined, VK extends keyof AutocompleteOptionType<I, CK> | ((item: AutocompleteOptionType<I, CK>) => any) | undefined = undefined">
import Dropdown from '~/components/base/dropdown/Dropdown.vue'
import AutocompleteControl from './AutocompleteControl.vue'
import AutocompletePopup from './AutocompletePopup.vue'
import { provideAutocompleteContext } from './context'
import { useAutocomplete } from './useAutocomplete'

export interface AutocompleteProps<
  I extends Record<string, any>,
  CK extends keyof I | ((item: I) => any[]) | undefined = undefined,
  VK extends keyof AutocompleteOptionType<I, CK> | ((item: AutocompleteOptionType<I, CK>) => any) | undefined = undefined,
> {
  /** Options when flat; Groups when `itemChildren` is given. */
  items: I[]
  /**
   * Reads a Group's Options. Passing it switches `items` from Options to Groups, and every
   * other `item*` accessor then keys off the *children*.
   */
  itemChildren?: CK
  /** Rendered, matched against by the Query, and echoed into the input when an Option wins. */
  itemLabel?: AutocompleteAccessor<AutocompleteOptionType<I, CK>, string>
  /** What `v-model` emits. Omit to emit the whole Item — then `itemKey` is required. */
  itemValue?: VK
  /** Identity. Defaults to `itemValue`, which is why the common case needs no Key at all. */
  itemKey?: AutocompleteAccessor<AutocompleteOptionType<I, CK>, Key>
  itemDisabled?: AutocompleteAccessor<AutocompleteOptionType<I, CK>, boolean>
  /**
   * The Group label, read from an element of `items`: the Option itself when flat, the Group
   * object when nested. Omit for an ungrouped Autocomplete.
   */
  itemGroup?: AutocompleteAccessor<I, string>
  id?: string
  placeholder?: string
  /**
   * A Dirty Query survives Abandon and stands as the value, which the consumer reads as
   * `modelValue ?? query`. See CONTEXT.md — Freeform.
   *
   * A plain `boolean`, deliberately: it changes no model's type, so none of ADR-0003's
   * generic-prop casting applies here.
   */
  freeform?: boolean
  /**
   * Whether typing highlights the first Option whose Label *starts with* the Query, making
   * `Enter` commit it. Defaults to `!freeform` — auto-highlighting in Freeform is how `Enter`
   * commits a suggestion the user was ignoring.
   *
   * It needs `default: undefined` below, and that line is load-bearing. A `boolean` prop
   * compiles to `type: Boolean`, and Vue's Boolean casting turns an *absent* prop into
   * `false` unless the options object has a `default` key — which would make "not set"
   * indistinguishable from "off", so the `!freeform` fallback could never fire. Same casting
   * rule as ADR-0003, biting from the same direction as Select's rejected `filterFn: false`.
   * Guarded by the `autoHighlight` cases in `AutocompleteState.spec.ts`.
   */
  autoHighlight?: boolean
  /** How a Label is matched against the Query. Defaults to a case-insensitive substring. */
  filterFn?: (item: AutocompleteOptionType<I, CK>, query: string) => boolean
  /**
   * The parent narrows `items` itself (server-side search); render them untouched. Debouncing
   * belongs to the parent too — see README, "Async".
   */
  externalFilter?: boolean
  /**
   * Below this many characters the popup offers no Options. `0` keeps the field browsable.
   *
   * It gates *searching*, so it stops applying once an Option is resolved — a Label is often
   * shorter than the threshold. A Value whose Item has not arrived resolves to nothing, so the
   * threshold still applies there.
   */
  minQueryLength?: number
  /** Shown in place of the list while the Query is too short and no Option is resolved. */
  minQueryText?: string
  emptyText?: string
  clearable?: boolean
  clearLabel?: string
  toggleLabel?: string
  /** The options list is not yet authoritative. Does not disable the control. */
  loading?: boolean
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  dropdownProps?: DropdownProps
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<AutocompleteProps<I, CK, VK>>(), {
  items: () => [],
  placeholder: 'Search…',
  emptyText: 'No results',
  clearLabel: 'Clear selection',
  toggleLabel: 'Show options',
  minQueryLength: 0,
  // Keeps "not set" distinguishable from "off". See the prop's note — without the key, Vue
  // casts the absent prop to `false` and the `!freeform` default is unreachable.
  autoHighlight: undefined,
})

/**
 * No `default`: an uncontrolled Autocomplete starts genuinely empty rather than with a
 * fabricated value. Null means "no Option is chosen", which in Freeform is the normal state
 * for a value the consumer reads off `query` instead.
 */
const modelValue = defineModel<AutocompleteModel<AutocompleteOptionType<I, CK>, VK>>()

/**
 * The Query — see CONTEXT.md. Modelled rather than internal, because in Freeform it carries
 * the value, and because a consumer running a server search needs to watch it. It never
 * resets on close: it is the input's visible text, not a filter.
 */
const query = defineModel<string>('query', { default: '' })

const isOpen = ref(false)
const fallbackId = useId()
const autocompleteId = computed(() => props.id ?? fallbackId)
const listboxId = computed(() => `${autocompleteId.value}-listbox`)

const autocomplete = useAutocomplete<AutocompleteOptionType<I, CK>>({
  // Getters, so swapping an accessor at runtime stays reactive.
  items: () => props.items,
  get itemLabel() {
    return props.itemLabel
  },
  get itemValue() {
    return props.itemValue as AutocompleteAccessor<AutocompleteOptionType<I, CK>, any> | undefined
  },
  get itemKey() {
    return props.itemKey
  },
  get itemDisabled() {
    return props.itemDisabled
  },
  get itemGroup() {
    return props.itemGroup
  },
  get itemChildren() {
    return props.itemChildren as AutocompleteAccessor<any, AutocompleteOptionType<I, CK>[]> | undefined
  },
  id: autocompleteId,
  isOpen,
  query,
  filterFn: () => props.filterFn,
  externalFilter: () => props.externalFilter,
  minQueryLength: () => props.minQueryLength,
  freeform: () => props.freeform,
  autoHighlight: () => props.autoHighlight,
  loading: () => props.loading,
  disabled: () => props.disabled,
  selectedValue: () => modelValue.value,
  onValueChange: value => (modelValue.value = value as AutocompleteModel<AutocompleteOptionType<I, CK>, VK>),
})

const controlRef = useTemplateRef('controlRef')

/**
 * Restores the (A) invariant whenever the Value changes from outside — an initial model, a
 * form reset, or an Item that only resolves once `items` arrive. `commit` and `abandon`
 * already write both halves, so for the component's own writes this is a no-op.
 */
watch(autocomplete.selectedOption, (option) => {
  if (option && option.label !== query.value) query.value = option.label
}, { immediate: true })

/**
 * Opening a filled field selects its text, so the next keystroke replaces the Label instead
 * of appending to it. Deferred a tick: the input may not have focus yet when a chevron click
 * opens the popup.
 */
watch(isOpen, async (open) => {
  if (!open || !autocomplete.hasValue.value) return
  await nextTick()
  controlRef.value?.selectAll()
})

const canClear = computed(() =>
  !!props.clearable && !props.disabled && (autocomplete.hasValue.value || !!query.value))

const defaultMinQueryText = computed(() =>
  `Type at least ${props.minQueryLength} character${props.minQueryLength === 1 ? '' : 's'}`)

/**
 * Clicking the input must place a caret, never dismiss — so the control is whitelisted out of
 * `Dropdown`'s click-outside. Scoped to this instance's id; a shared selector would make a
 * click on any *other* Autocomplete count as inside this one.
 */
const whiteList = computed(() => [`[data-autocomplete="${autocompleteId.value}"]`])

function onInputClick() {
  // Already open: repositioning the Active Option here would move the highlight out from
  // under a user who only wanted the caret.
  if (isOpen.value) return
  autocomplete.open('selected-or-none')
}

function onToggle() {
  if (isOpen.value) return autocomplete.close()
  autocomplete.open('selected-or-none')
  controlRef.value?.focus()
}

function onClear() {
  autocomplete.clear()
  controlRef.value?.focus()
}

/**
 * Close *before* Abandon, and the order is the whole point.
 *
 * Blur fires on `mousedown`; `Dropdown`'s click-outside fires on `click`. Abandoning first
 * would therefore restore the Last Commit while the popup is still open, and the list would
 * visibly flip from "No results" to every Option in the gap between the two events.
 * `AutocompletePopup` freezes what it draws once closed, which covers the rest of the window —
 * the leave transition, during which this handler's own model writes land.
 *
 * Every pointer gesture *inside* the control prevents `mousedown`, so a blur here is always a
 * genuine exit and closing is always right.
 */
function onBlur() {
  autocomplete.close()
  autocomplete.abandon()
}

provideAutocompleteContext({
  autocomplete,
  listboxId,
  isOpen,
  labelledBy: computed(() => autocompleteId.value),
  emptyText: computed(() => props.emptyText),
  minQueryText: computed(() => props.minQueryText ?? defaultMinQueryText.value),
  onOptionSelect: option => autocomplete.commit(option),
})

defineExpose({
  focus: () => controlRef.value?.focus(),
  /** The Last Commit, for a consumer that needs to know what Abandon would restore. */
  lastCommit: autocomplete.lastCommit,
})
</script>

<template>
  <Dropdown
    v-model:open="isOpen"
    placement="bottom-start"
    :manage-keyboard="false"
    :focus-on-open="false"
    :triggers="[]"
    :dismiss-on-click-outside="true"
    :restore-focus="false"
    :white-list="whiteList"
    :disabled="disabled"
    v-bind="dropdownProps"
  >
    <AutocompleteControl
      :id="autocompleteId"
      ref="controlRef"
      :listbox-id="listboxId"
      :query="query"
      :is-open="isOpen"
      :placeholder="placeholder"
      :disabled="disabled"
      :invalid="invalid"
      :required="required"
      :loading="loading"
      :can-clear="canClear"
      :listbox-is-rendered="autocomplete.listboxIsRendered.value"
      :active-descendant-id="autocomplete.activeDescendantId.value"
      :clear-label="clearLabel"
      :toggle-label="toggleLabel"
      v-bind="$attrs"
      @input="autocomplete.handleInput"
      @open="onInputClick"
      @blur="onBlur"
      @clear="onClear"
      @toggle="onToggle"
      @keydown="autocomplete.handleKeydown"
    />

    <template #popover>
      <AutocompletePopup>
        <template v-if="$slots.option" #option="slotProps">
          <slot name="option" v-bind="slotProps" />
        </template>
        <template v-if="$slots.group" #group="slotProps">
          <slot name="group" v-bind="slotProps" />
        </template>
        <template v-if="$slots.empty" #empty="slotProps">
          <slot name="empty" v-bind="slotProps" />
        </template>
        <template v-if="$slots['min-query']" #min-query="slotProps">
          <slot name="min-query" v-bind="slotProps" />
        </template>
        <template v-if="$slots.loading" #loading>
          <slot name="loading" />
        </template>
      </AutocompletePopup>
    </template>
  </Dropdown>
</template>
