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
    <slot />
  </div>
</template>

<style scoped>
.accordion-content {
  height: var(--disclosure-panel-height, 0px);
  transition: height 250ms ease-in-out;
  overflow: clip;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
</style>
