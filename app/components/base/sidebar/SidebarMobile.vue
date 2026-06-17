<script setup lang="ts">
import SidebarContent from './SidebarContent.vue'

defineProps<{
  openSidebar: boolean
}>()
defineEmits<{
  collapse: []
}>()
</script>

<template>
  <Transition appear name="slide">
    <div
      v-if="openSidebar"
      data-open="true"
      class="group absolute top-0 bottom-0 left-0 z-(--sidebar) w-(--sidebar-width) shrink-0 overflow-hidden border-r border-elevated text-default backdrop-blur-2xl"
    >
      <SidebarContent :open="true" @toggle="$emit('collapse')" />
    </div>
  </Transition>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(-100%);
}

.slide-leave-to {
  transform: translateX(-100%);
}
</style>
