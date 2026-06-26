<script setup lang="ts">
import { injectAccordionPanelContext } from './context'

const { contentId, triggerId, panelContentRef, toggleExpanded } = injectAccordionPanelContext()!
</script>

<template>
  <div
    :id="contentId" ref="panelContentRef" role="region"
    :aria-labelledby="triggerId"
    class="accordion-content"
    @beforematch="toggleExpanded(true)"
  >
    <div class="py-2">
      <slot />
    </div>
  </div>
</template>
