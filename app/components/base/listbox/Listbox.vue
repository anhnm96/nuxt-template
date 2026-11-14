<script setup lang="ts">
import type { ListGroup } from '~/composables/useOptionList'
import ListboxOption from './ListboxOption.vue'

/**
 * The listbox that `Select` and `Autocomplete` show in their Popover: Groups, Options, the
 * empty state and the first-load state.
 *
 * Internal to those two hosts. It is not a component that a consumer composes with.
 *
 * What it draws arrives as props and not through `ListboxContext`. `AutocompletePopup` must
 * be able to pass a frozen snapshot while it closes, and a view that read the list itself
 * could not be frozen from outside. See DESIGN.md.
 */
export type ListboxState = 'loading' | 'options' | 'empty'

const props = defineProps<{
  /** The listbox id. The host's control names it in `aria-controls`. */
  id: string
  /**
   * The three states are ordered, not combined. A first load has nothing to report yet, so
   * the host must give it priority over `empty`.
   *
   * While `loading`, no element carries `id`. The host must then remove its `aria-controls`.
   */
  state: ListboxState
  /** Drawn while `state` is `options`. Rendering only — navigation stays flat. */
  groups: ListGroup<any>[]
  /** Labels the listbox, so the control's own label is announced with it. */
  labelledBy?: string
  multiselectable?: boolean
  /** Shown while `state` is `empty`. */
  emptyText?: string
  /** Passed to the `#empty` slot. */
  query?: string
}>()

/** The index of each Group's first Option within Visible Options. */
const groupOffsets = computed(() => {
  let next = 0
  return props.groups.map((group) => {
    const offset = next
    next += group.options.length
    return offset
  })
})
</script>

<template>
  <div v-if="state === 'loading'" class="relative grid min-h-24 place-items-center">
    <slot name="loading">
      <InnerLoading />
    </slot>
  </div>

  <div
    v-else
    :id="id"
    role="listbox"
    class="select-list"
    :aria-labelledby="labelledBy"
    :aria-multiselectable="multiselectable || undefined"
    data-slot="listbox"
  >
    <template v-if="state === 'options'">
      <div
        v-for="(group, groupIndex) in groups"
        :key="group.id"
        :role="group.label ? 'group' : undefined"
        :aria-labelledby="group.label ? group.id : undefined"
        :data-slot="group.label ? 'option-group' : undefined"
      >
        <!-- group label -->
        <div
          v-if="group.label"
          :id="group.id"
          aria-hidden="true"
          class="select-group-label"
          data-slot="group-label"
        >
          <slot name="group" :group="group">
            {{ group.label }}
          </slot>
        </div>

        <!-- options -->
        <ListboxOption
          v-for="(option, optionIndex) in group.options"
          :key="option.key"
          :option="option"
          :index="groupOffsets[groupIndex]! + optionIndex"
        >
          <template #default="optionSlot">
            <slot name="option" v-bind="optionSlot" />
          </template>
        </ListboxOption>
      </div>
    </template>

    <div v-else class="px-2 py-3 text-center text-muted initial:text-sm" role="presentation">
      <slot name="empty" :query="query ?? ''">
        {{ emptyText }}
      </slot>
    </div>
  </div>
</template>
