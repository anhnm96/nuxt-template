<script setup lang="ts">
import type { ListboxState } from '~/components/base/listbox/Listbox.vue'
import Listbox from '~/components/base/listbox/Listbox.vue'
import { injectSelectContext } from './context'

const ctx = injectSelectContext()
const { select } = ctx

const searchRef = useTemplateRef('searchRef')

/**
 * The search *box*, not the field. `keydown` is bound here so navigation keys work for a
 * custom `#search` slot too — they bubble up from whatever the consumer rendered.
 */
const searchBoxRef = useTemplateRef('searchBoxRef')

/**
 * `.inputtext` is `width: 100%`, so inside a shrink-to-fit container — inline-flex,
 * inline-block, a float, a `w-fit` item, or an absolutely positioned popup like this one —
 * it silently falls back to its `size="20"` intrinsic width and sizes the container instead.
 * `size="1"` is the cheap defence wherever `w-full` is supposed to be in charge.
 */
const SEARCH_FIELD_SIZE = 1

/**
 * The default field is the `#search` slot's *fallback*, so `searchRef` is null whenever a
 * consumer supplies their own. Fall back to the first focusable element in the search box,
 * otherwise focus stays on the trigger — and because `handleOpenKeydown` ignores printable
 * characters while `searchable`, the user would type into nothing and the query could never
 * grow past the character that opened the popup.
 */
function focusSearchField() {
  const own = searchRef.value
  if (own) return own.focus()
  searchBoxRef.value
    ?.querySelector<HTMLElement>('input, textarea, [contenteditable]:not([contenteditable="false"])')
    ?.focus()
}

/**
 * Nothing to show at all — a full spinner is honest here. Aliased rather than recomputed:
 * this is the same condition that refuses to open, and the trigger drops its `aria-controls`
 * on it, so the three must never drift apart.
 */
const isBlockingLoad = select.isBlocked
/** Results are stale but usable — keep the list live rather than flickering to a spinner. */
const isRefreshing = computed(() => ctx.loading.value && select.allOptions.value.length > 0)

const listboxState = computed<ListboxState>(() => {
  if (isBlockingLoad.value) return 'loading'
  return select.visibleOptions.value.length > 0 ? 'options' : 'empty'
})

onMounted(() => {
  // The popup only mounts while open, so this is "focus the search field on open".
  if (ctx.searchable.value) focusSearchField()
})
</script>

<template>
  <div class="flex flex-col" data-slot="select-popup">
    <div
      v-if="ctx.searchable.value"
      ref="searchBoxRef"
      class="relative shrink-0 border-b border-elevated p-1"
      data-slot="select-search"
      @keydown="select.handleKeydown"
    >
      <slot
        name="search"
        :query="select.query"
        :listbox-id="ctx.listboxId.value"
        :active-descendant-id="select.activeDescendantId.value"
      >
        <input
          ref="searchRef"
          v-model="select.query.value"
          type="text"
          role="combobox"
          aria-expanded="true"
          :size="SEARCH_FIELD_SIZE"
          aria-autocomplete="list"
          autocomplete="off"
          :aria-controls="isBlockingLoad ? undefined : ctx.listboxId.value"
          :aria-activedescendant="select.activeDescendantId.value"
          :placeholder="ctx.searchPlaceholder.value"
          class="inputtext initial:py-1.5 initial:text-sm"
        >
      </slot>
      <Spinner v-if="isRefreshing" class="absolute top-1/2 right-3 -translate-y-1/2 text-sm" />
    </div>

    <!-- listbox -->
    <Listbox
      :id="ctx.listboxId.value"
      :state="listboxState"
      :groups="select.groups.value"
      :labelled-by="ctx.labelledBy.value"
      :multiselectable="ctx.multiple"
      :empty-text="ctx.emptyText.value"
      :query="select.query.value"
    >
      <template #loading>
        <slot name="loading" />
      </template>
      <template #group="slotProps">
        <slot name="group" v-bind="slotProps" />
      </template>
      <template #option="slotProps">
        <slot name="option" v-bind="slotProps" />
      </template>
      <template #empty="slotProps">
        <slot name="empty" v-bind="slotProps" />
      </template>
    </Listbox>
  </div>
</template>
