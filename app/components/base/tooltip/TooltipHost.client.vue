<script setup lang="ts">
import TooltipGroupSurface from './TooltipGroupSurface.vue'
import { useTooltipGroups } from './useTooltipGroups'

const registry = useTooltipGroups()
registry.hosts.value++
onBeforeUnmount(() => {
  registry.hosts.value--
  if (!registry.hosts.value) registry.clear()
})
</script>

<template>
  <Teleport to="body">
    <TooltipGroupSurface
      v-for="[name, group] in registry.groups"
      :key="name"
      :group="group"
      @element="group.element.value = $event"
      @closed="registry.finishClose(group, $event)"
    />
  </Teleport>
</template>
