<script setup lang="ts">
import Button from '~/components/Button.vue'
import { injectAccordionPanelContext } from './context'

const { contentId, triggerId, expanded, disabled, toggleExpanded } = injectAccordionPanelContext()!
</script>

<template>
  <Button
    :id="triggerId" :aria-expanded="expanded"
    :aria-controls="contentId"
    :aria-disabled="disabled"
    @click="toggleExpanded()"
  >
    <slot :expanded />
  </Button>
</template>
