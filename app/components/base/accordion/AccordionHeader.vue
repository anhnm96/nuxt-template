<script setup lang="ts">
import { injectAccordionPanelContext } from './context'

const { contentId, triggerId, expanded, disabled, toggleExpanded } = injectAccordionPanelContext()!
</script>

<template>
  <button
    :id="triggerId" :aria-expanded="expanded"
    :aria-controls="contentId"
    :aria-disabled="disabled"
    class="group flex w-full min-w-0 justify-start gap-1.5 font-medium focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-primary"
    :data-state="expanded ? 'open' : 'closed'"
    @click="toggleExpanded()"
  >
    <slot name="custom" :expanded />
    <template v-if="!$slots.custom">
      <slot name="label" :expanded>
        <span class="text-start wrap-break-word">
          <slot />
        </span>
      </slot>
      <slot name="icon" :expanded>
        <Icon class="ms-auto size-5 shrink-0 transition-transform duration-200 group-data-[state=open]:-scale-y-100" name="lucide:chevron-down" />
      </slot>
    </template>
  </button>
</template>
