<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { injectAccordionPanelContext } from './context'

withDefaults(defineProps<{ wrapperProps?: PtSlot<HTMLAttributes> }>(), { wrapperProps: '' })
const { contentId, triggerId, panelContentRef, toggleExpanded } = injectAccordionPanelContext()!
</script>

<template>
  <div
    :id="contentId" ref="panelContentRef" role="region"
    :aria-labelledby="triggerId"
    class="accordion-content"
    data-slot="accordion-content"
    @beforematch="toggleExpanded(true)"
  >
    <div
      class="py-2"
      v-bind="normalizePt(wrapperProps)"
      data-slot="accordion-content-wrapper"
    >
      <slot />
    </div>
  </div>
</template>
