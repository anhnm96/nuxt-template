<script setup lang="ts">
const SIDEBAR_WIDTH_OPEN = '14rem'
const SIDEBAR_WIDTH_CLOSED = '3.25rem'
const openSidebar = ref(false)

function toggleSidebar() {
  openSidebar.value = !openSidebar.value
}
</script>

<template>
  <div
    :data-open="openSidebar"
    :style="{ '--sidebar-width': SIDEBAR_WIDTH_CLOSED,
    }"
    class="group z-(--sidebar) w-(--sidebar-width) shrink-0 overflow-hidden border-r border-elevated text-default backdrop-blur-2xl transition-[width] duration-200 ease-linear will-change-[width]"
  >
    <div class="flex h-full flex-col">
      <div class="grid size-13 place-items-center">
        <Icon size="24" name="arcticons:openai-chatgpt" />
      </div>
      <div data-sidebar="content" class="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
        <div class="mt-2 flex flex-col items-stretch">
          <a href="#" class="btn btn-text gap-1.5 overflow-hidden px-4 py-1.75 text-sm font-normal transition-[width,padding]">
            <Icon class="shrink-0" size="20" name="ph:note-pencil" />
          </a>
          <a href="#" class="btn btn-text gap-1.5 overflow-hidden px-4 py-1.75 text-sm font-normal transition-[width,padding]">
            <Icon class="shrink-0" size="20" name="ph:magnifying-glass" />
          </a>
          <a href="#" class="btn btn-text gap-1.5 overflow-hidden px-4 py-1.75 text-sm font-normal transition-[width,padding]">
            <Icon class="shrink-0" size="20" name="ph:images" />
          </a>
        </div>
        <div data-sidebar="group" class="hidden">
          <div class="flex h-8 shrink-0 items-center px-2 text-xs font-medium text-muted">
            Projects
          </div>
          <div class="flex flex-col">
            <a href="#" class="btn btn-text gap-1.5 overflow-hidden px-4 py-1.75 text-sm font-normal transition-[width,padding]">
              <Icon class="shrink-0" size="20" name="catppuccin:rust" />
            </a>
          </div>
          <div class="flex flex-col">
            <a href="#" class="btn btn-text gap-1.5 overflow-hidden px-4 py-1.75 text-sm font-normal transition-[width,padding]">
              <Icon class="shrink-0" size="20" name="devicon:nuxt" />
            </a>
          </div>
          <div class="flex flex-col">
            <a href="#" class="btn btn-text gap-1.5 overflow-hidden px-4 py-1.75 text-sm font-normal transition-[width,padding]">
              <Icon class="shrink-0" size="20" name="catppuccin:docker" />
            </a>
          </div>
        </div>
      </div>
      <button class="mt-auto flex flex-center p-3" @click="toggleSidebar">
        <Icon
          class="transition-transform duration-300"
          :class="[openSidebar && 'rotate-180']"
          name="mdi:chevron-left"
        />
      </button>
    </div>
  </div>
  <Transition appear name="slide">
    <div
      v-if="openSidebar"
      :data-open="openSidebar"
      :style="{ '--sidebar-width': openSidebar ? SIDEBAR_WIDTH_OPEN : 0,
      }"
      class="group absolute top-0 bottom-0 left-0 z-(--sidebar) w-(--sidebar-width) shrink-0 overflow-hidden border-r border-elevated text-default backdrop-blur-2xl transition-[width] duration-200 ease-linear will-change-[width]"
      :class="[openSidebar && '']"
    >
      <div class="group flex h-full flex-col">
        <div class="grid size-13 place-items-center">
          <Icon size="24" name="arcticons:openai-chatgpt" />
        </div>
        <div data-sidebar="content" class="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
          <div class="mt-2 flex flex-col items-stretch">
            <a href="#" class="btn btn-text justify-start! gap-1.5 overflow-hidden py-1.75 text-sm font-normal transition-[width,padding]">
              <Icon class="shrink-0" size="20" name="ph:note-pencil" />
              <span class="truncate leading-none opacity-0 transition-opacity duration-200 group-data-[open=true]:opacity-100">New chat</span>
            </a>
            <a href="#" class="btn btn-text justify-start! gap-1.5 overflow-hidden py-1.75 text-sm font-normal transition-[width,padding]">
              <Icon class="shrink-0" size="20" name="ph:magnifying-glass" />
              <span class="truncate leading-none opacity-0 transition-opacity duration-200 group-data-[open=true]:opacity-100">Search chats</span>
            </a>
            <a href="#" class="btn btn-text justify-start! gap-1.5 overflow-hidden py-1.75 text-sm font-normal transition-[width,padding]">
              <Icon class="shrink-0" size="20" name="ph:images" />
              <span class="truncate leading-none opacity-0 transition-opacity duration-200 group-data-[open=true]:opacity-100">Images</span>
            </a>
          </div>
          <div data-sidebar="group" class="group-data-[open=false]:hidden">
            <div class="flex h-8 shrink-0 items-center px-2 text-xs font-medium text-muted">
              Projects
            </div>
            <div class="flex flex-col">
              <a href="#" class="btn btn-text justify-start! gap-1.5 overflow-hidden py-1.75 text-sm font-normal transition-[width,padding]">
                <Icon class="shrink-0" size="20" name="catppuccin:rust" />
                <span class="truncate leading-none opacity-0 transition-opacity duration-200 group-data-[open=true]:opacity-100">Rust</span>
              </a>
            </div>
            <div class="flex flex-col">
              <a href="#" class="btn btn-text justify-start! gap-1.5 overflow-hidden py-1.75 text-sm font-normal transition-[width,padding]">
                <Icon class="shrink-0" size="20" name="devicon:nuxt" />
                <span class="truncate leading-none opacity-0 transition-opacity duration-200 group-data-[open=true]:opacity-100">Nuxt</span>
              </a>
            </div>
            <div class="flex flex-col">
              <a href="#" class="btn btn-text justify-start! gap-1.5 overflow-hidden py-1.75 text-sm font-normal transition-[width,padding]">
                <Icon class="shrink-0" size="20" name="catppuccin:docker" />
                <span class="truncate leading-none opacity-0 transition-opacity duration-200 group-data-[open=true]:opacity-100">Docker</span>
              </a>
            </div>
          </div>
        </div>
        <button class="mt-auto flex flex-center p-3" @click="toggleSidebar">
          <Icon
            class="transition-transform duration-300"
            :class="[openSidebar && 'rotate-180']"
            name="mdi:chevron-left"
          />
        </button>
      </div>
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
