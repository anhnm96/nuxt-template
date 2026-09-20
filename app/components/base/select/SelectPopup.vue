<script setup lang="ts">
import { injectSelectContext } from './context'
import SelectOption from './SelectOption.vue'

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

const hasOptions = computed(() => select.visibleOptions.value.length > 0)
/**
 * Nothing to show at all — a full spinner is honest here. Aliased rather than recomputed:
 * this is the same condition that refuses to open, and the trigger drops its `aria-controls`
 * on it, so the three must never drift apart.
 */
const isBlockingLoad = select.isBlocked
/** Results are stale but usable — keep the list live rather than flickering to a spinner. */
const isRefreshing = computed(() => ctx.loading.value && select.allOptions.value.length > 0)

/** Index within Visible Options — options are rendered per group but navigated flat. */
function flatIndex(groupIndex: number, optionIndex: number) {
  let base = 0
  for (let i = 0; i < groupIndex; i++) base += select.groups.value[i]!.options.length
  return base + optionIndex
}

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

    <div v-if="isBlockingLoad" class="relative grid min-h-24 place-items-center">
      <slot name="loading">
        <InnerLoading />
      </slot>
    </div>

    <div
      v-else
      :id="ctx.listboxId.value"
      role="listbox"
      class="select-list"
      :aria-labelledby="ctx.labelledBy.value"
      :aria-multiselectable="ctx.multiple || undefined"
      data-slot="select-list"
    >
      <template v-if="hasOptions">
        <!-- Rendering only: `visibleOptions` stays flat, and an empty group is never built. -->
        <div
          v-for="(group, groupIndex) in select.groups.value"
          :key="group.id"
          :role="group.label ? 'group' : undefined"
          :aria-labelledby="group.label ? group.id : undefined"
          :data-slot="group.label ? 'option-group' : undefined"
        >
          <!-- aria-hidden yet still the labelledby target: name computation reads hidden nodes. -->
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

          <SelectOption
            v-for="(option, optionIndex) in group.options"
            :key="option.key"
            :option="option"
            :index="flatIndex(groupIndex, optionIndex)"
          >
            <template #default="optionSlot">
              <!-- Fallback lives here: forwarding a slot always satisfies the child's own. -->
              <slot name="option" v-bind="optionSlot">
                <span class="truncate">{{ optionSlot.option.label }}</span>
              </slot>
            </template>
          </SelectOption>
        </div>
      </template>

      <div v-else class="px-2 py-3 text-center text-muted initial:text-sm" role="presentation">
        <slot name="empty" :query="select.query.value">
          {{ ctx.emptyText.value }}
        </slot>
      </div>
    </div>
  </div>
</template>
