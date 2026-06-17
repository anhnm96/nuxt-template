<script setup lang="ts">
import { breakpointsTailwind } from '@vueuse/core'
import SidebarContent from './SidebarContent.vue'
import SidebarMobile from './SidebarMobile.vue'

const breakpoints = useBreakpoints(breakpointsTailwind)
const isSmallerThanXl = breakpoints.smaller('xl')

const SIDEBAR_WIDTH_OPEN = '14rem'
const SIDEBAR_WIDTH_CLOSED = '3.25rem'
const openSidebar = ref(false)
const openSidebarMobile = ref(false)

watch(isSmallerThanXl, (newVal) => {
  if (newVal) {
    openSidebar.value = false
  } else {
    openSidebar.value = true
    openSidebarMobile.value = false
  }
}, { immediate: true })

function toggleSidebar() {
  if (isSmallerThanXl.value) {
    openSidebarMobile.value = !openSidebarMobile.value
  } else {
    openSidebar.value = !openSidebar.value
  }
}

function handleCollapseMobile() {
  openSidebarMobile.value = false
}
</script>

<template>
  <div
    :data-open="openSidebar"
    :style="{ '--sidebar-width': openSidebar ? SIDEBAR_WIDTH_OPEN : SIDEBAR_WIDTH_CLOSED }"
    class="group z-(--sidebar) w-(--sidebar-width) shrink-0 overflow-hidden border-r border-elevated text-default backdrop-blur-2xl transition-[width] duration-200 ease-linear will-change-[width]"
  >
    <SidebarContent :open="openSidebar" @toggle="toggleSidebar" />
  </div>
  <!-- mobile sidebar -->
  <SidebarMobile
    v-click-outside="handleCollapseMobile"
    :open-sidebar="openSidebarMobile"
    :style="{ '--sidebar-width': SIDEBAR_WIDTH_OPEN }"
    @collapse="handleCollapseMobile"
  />
</template>
