<script lang="ts">
import type { SelectAccessor, SelectModel, SelectOption, SelectOptionType } from './useSelect'
import type { DropdownProps } from '~/components/base/dropdown/Dropdown.vue'
</script>

<script setup lang="ts" generic="I extends Record<string, any>, CK extends keyof I | ((item: I) => any[]) | undefined = undefined, VK extends keyof SelectOptionType<I, CK> | ((item: SelectOptionType<I, CK>) => any) | undefined = undefined, M extends boolean = false">
import Dropdown from '~/components/base/dropdown/Dropdown.vue'
import { provideSelectContext } from './context'
import SelectControl from './SelectControl.vue'
import SelectPopup from './SelectPopup.vue'
import { useSelect } from './useSelect'

export interface SelectProps<
  I extends Record<string, any>,
  CK extends keyof I | ((item: I) => any[]) | undefined = undefined,
  VK extends keyof SelectOptionType<I, CK> | ((item: SelectOptionType<I, CK>) => any) | undefined = undefined,
  M extends boolean = false,
> {
  /** Options when flat; Groups when `itemChildren` is given. */
  items: I[]
  /**
   * Reads a Group's Options. Passing it switches `items` from Options to Groups, and every
   * other `item*` accessor then keys off the *children*.
   */
  itemChildren?: CK
  /** Rendered, and matched against by Search and Typeahead. */
  itemLabel?: SelectAccessor<SelectOptionType<I, CK>, string>
  /** What `v-model` emits. Omit to emit the whole Item — then `itemKey` is required. */
  itemValue?: VK
  /** Identity. Defaults to `itemValue`, which is why the common case needs no Key at all. */
  itemKey?: SelectAccessor<SelectOptionType<I, CK>, Key>
  itemDisabled?: SelectAccessor<SelectOptionType<I, CK>, boolean>
  /**
   * The Group label, read from an element of `items`: the Option itself when flat, the Group
   * object when nested. Omit for an ungrouped Select.
   */
  itemGroup?: SelectAccessor<I, string>
  /**
   * Whether several Options can be selected, and what narrows `modelValue` to `V[]` or
   * `V | null`.
   *
   * `M & boolean`, never a bare `M`: a naked type parameter compiles to `type: null`, so Vue
   * skips Boolean casting and `<Select multiple>` arrives as `''` — falsy — silently behaving
   * as single-select. The intersection gives the compiler a concrete `boolean` to emit while
   * TypeScript still infers the literal. Guarded by `pages/test/select-types.vue` (narrowing)
   * and the `multiple: ''` case in `SelectModes.spec.ts` (casting). See ADR-0003.
   */
  multiple?: M & boolean
  id?: string
  placeholder?: string
  /** Renders the search field. Independent of who does the filtering. */
  searchable?: boolean
  searchPlaceholder?: string
  /** How a Label is matched against the Search Query. Defaults to a case-insensitive substring. */
  filterFn?: (item: SelectOptionType<I, CK>, query: string) => boolean
  /** The parent narrows `items` itself (server-side search); render them untouched. */
  externalFilter?: boolean
  emptyText?: string
  clearable?: boolean
  clearLabel?: string
  /** The options list is not yet authoritative. Does not disable the control. */
  loading?: boolean
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  /** Separator for the default joined display when `multiple`. */
  separator?: string
  dropdownProps?: DropdownProps
}

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<SelectProps<I, CK, VK, M>>(), {
  items: () => [],
  searchPlaceholder: 'Search…',
  emptyText: 'No results',
  clearLabel: 'Clear selection',
  separator: ', ',
})

/**
 * No `default`: the two modes would need different ones (`null` vs `[]`), and a prop can only
 * carry one. Undefined is normalised where it is read instead, which also means an
 * uncontrolled Select starts genuinely empty rather than with a fabricated value.
 */
const modelValue = defineModel<SelectModel<SelectOptionType<I, CK>, VK, M>>()

const isOpen = ref(false)
const fallbackId = useId()
const selectId = computed(() => props.id ?? fallbackId)
const listboxId = computed(() => `${selectId.value}-listbox`)

const isMultiple = computed(() => !!props.multiple)
const placeholderText = computed(() =>
  props.placeholder ?? (isMultiple.value ? 'Select options' : 'Select an option'))

/** Zero-or-one for single, many for multiple — the composable only ever wants a list. */
const selectedValues = computed<unknown[]>(() => {
  if (isMultiple.value) return (modelValue.value as unknown[] | undefined) ?? []
  return isNullish(modelValue.value) ? [] : [modelValue.value]
})

const canClear = computed(() =>
  !!props.clearable && !props.disabled && selectedValues.value.length > 0)

const select = useSelect<SelectOptionType<I, CK>>({
  // Getters, so swapping an accessor at runtime stays reactive.
  items: () => props.items,
  get itemLabel() {
    return props.itemLabel
  },
  get itemValue() {
    return props.itemValue as SelectAccessor<SelectOptionType<I, CK>, any> | undefined
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
    return props.itemChildren as SelectAccessor<any, SelectOptionType<I, CK>[]> | undefined
  },
  id: selectId,
  isOpen,
  searchable: () => props.searchable,
  filterFn: () => props.filterFn,
  externalFilter: () => props.externalFilter,
  disabled: () => props.disabled,
  loading: () => props.loading,
  canClear: () => canClear.value,
  onClear,
  selectedValues: () => selectedValues.value,
  onSelect,
})

/** Resolvable Selected Options — 0..1 when single, 0..n when multiple. */
const selectedOptions = computed(() => select.allOptions.value.filter(select.isSelected))
/**
 * The convenience for the single case. The `#value` slot has one signature for both modes —
 * `options` is 0..1 when single and 0..n when multiple — because a slot whose props changed
 * shape with `multiple` would be the one thing genuinely harder to type here.
 */
const selectedOption = computed(() => selectedOptions.value[0] ?? null)

/**
 * Selected Values with no matching Item. Counted by distinct Key, so a Value the parent
 * happened to pass twice cannot inflate it — and clamped at zero, because `items` carrying
 * two rows with the same Key makes `selectedOptions` the larger of the two.
 *
 * Rendered rather than hidden: joining only the resolved labels under-reports the selection
 * while `items` is still arriving, and the form would then submit more than the trigger
 * admits to. Only reachable when `multiple` — a single Select resolves all-or-nothing and
 * falls through to the placeholder instead.
 */
const unresolvedCount = computed(() =>
  Math.max(0, select.selectedKeys.value.size - selectedOptions.value.length))
const resolving = computed(() => unresolvedCount.value > 0 && !!props.loading)

const displayLabel = computed(() =>
  selectedOptions.value.map(o => o.label).join(props.separator))

function onSelect(option: SelectOption<SelectOptionType<I, CK>>) {
  if (!isMultiple.value) {
    modelValue.value = option.value
    isOpen.value = false
    return
  }
  const next = [...((modelValue.value as unknown[] | undefined) ?? [])]
  const index = next.findIndex(value => select.keyOfValue(value) === option.key)
  if (index >= 0) next.splice(index, 1)
  else next.push(option.value)
  modelValue.value = next as SelectModel<SelectOptionType<I, CK>, VK, M>
  // The popup deliberately stays open — selecting is not committing here.
}

/**
 * Dropdown owns click-to-open, so the blocked state has to reach it as `disabled`: guarding
 * only `useSelect.open()` would block the keyboard while letting a mouse click through.
 */
const isDropdownDisabled = computed(() => props.disabled || select.isBlocked.value)

const controlRef = useTemplateRef('controlRef')

function onClear() {
  modelValue.value = (isMultiple.value ? [] : null) as SelectModel<SelectOptionType<I, CK>, VK, M>
  // The clear button unmounts the moment there is nothing to clear, so focus would land on
  // <body> and the keyboard user would lose their place in the form.
  nextTick(() => {
    // `$el` is `any`, so a generic `querySelector<HTMLElement>` here is an untyped call with
    // a type argument (TS2347). Narrow the element first instead.
    const control = controlRef.value?.$el as HTMLElement | undefined
    control?.querySelector<HTMLElement>('[data-slot="select-trigger"]')?.focus()
  })
}

provideSelectContext({
  select,
  // A getter, so `multiple` stays live without widening the context type to a ref.
  get multiple() {
    return isMultiple.value
  },
  listboxId,
  labelledBy: computed(() => selectId.value),
  loading: computed(() => !!props.loading),
  searchable: computed(() => !!props.searchable),
  searchPlaceholder: computed(() => props.searchPlaceholder),
  emptyText: computed(() => props.emptyText),
  onOptionSelect: onSelect,
})

const dropdownRef = useTemplateRef('dropdownRef')
defineExpose({
  toggleShow: (value?: boolean) => dropdownRef.value?.toggleShow(value),
})
</script>

<template>
  <Dropdown
    ref="dropdownRef"
    v-model:open="isOpen"
    placement="bottom-start"
    :manage-keyboard="false"
    :disabled="isDropdownDisabled"
    v-bind="dropdownProps"
  >
    <SelectControl
      :id="selectId"
      ref="controlRef"
      :listbox-id="listboxId"
      :is-open="isOpen"
      :searchable="searchable"
      :disabled="disabled"
      :invalid="invalid"
      :required="required"
      :loading="loading"
      :blocked="select.isBlocked.value"
      :can-clear="canClear"
      :resolving="resolving"
      :active-descendant-id="select.activeDescendantId.value"
      :clear-label="clearLabel"
      v-bind="$attrs"
      @clear="onClear"
      @keydown="select.handleKeydown"
    >
      <slot
        name="value"
        :model-value="modelValue"
        :option="selectedOption"
        :options="selectedOptions"
        :unresolved-count="unresolvedCount"
      >
        <template v-if="selectedOptions.length">
          <span class="truncate">{{ displayLabel }}</span>
          <span v-if="unresolvedCount" class="shrink-0 text-muted">+{{ unresolvedCount }}</span>
        </template>
        <span v-else class="select-placeholder truncate">{{ placeholderText }}</span>
      </slot>
    </SelectControl>

    <template #popover>
      <SelectPopup>
        <template v-if="$slots.search" #search="slotProps">
          <slot name="search" v-bind="slotProps" />
        </template>
        <template v-if="$slots.option" #option="slotProps">
          <slot name="option" v-bind="slotProps" />
        </template>
        <template v-if="$slots.group" #group="slotProps">
          <slot name="group" v-bind="slotProps" />
        </template>
        <template v-if="$slots.empty" #empty="slotProps">
          <slot name="empty" v-bind="slotProps" />
        </template>
        <template v-if="$slots.loading" #loading>
          <slot name="loading" />
        </template>
      </SelectPopup>
    </template>
  </Dropdown>
</template>
