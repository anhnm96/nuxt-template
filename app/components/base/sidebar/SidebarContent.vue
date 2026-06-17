<script setup lang="ts">
defineProps<{
  open: boolean
}>()

defineEmits<{
  toggle: [value?: boolean]
}>()

const generalLinks = [
  { label: 'New chat', icon: 'ph:note-pencil' },
  { label: 'Search chats', icon: 'ph:magnifying-glass' },
  { label: 'Images', icon: 'ph:images' },
]

const projectLinks = [
  { label: 'Rust', icon: 'catppuccin:rust' },
  { label: 'Nuxt', icon: 'devicon:nuxt' },
  { label: 'Docker', icon: 'catppuccin:docker' },
]
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="grid size-13 place-items-center">
      <Icon size="24" name="arcticons:openai-chatgpt" />
    </div>
    <div data-sidebar="content" class="flex flex-1 flex-col overflow-x-hidden overflow-y-auto px-2">
      <!-- general -->
      <div class="mt-2 flex flex-col items-stretch">
        <a
          v-for="link in generalLinks"
          :key="link.label"
          href="#"
          class="btn btn-text justify-start gap-1.5 overflow-hidden px-4 py-1.75 font-normal text-nowrap transition-all group-data-[open=false]:px-1.75"
        >
          <Icon class="shrink-0" size="20" :name="link.icon" />
          <span class="truncate opacity-0 transition-opacity duration-200 group-data-[open=true]:opacity-100">{{ link.label }}</span>
        </a>
      </div>
      <!-- group -->
      <div data-sidebar="group" class="flex flex-col">
        <AnimateHeight :data-open="open" class="px-2 text-xs font-medium text-muted">
          <span class="inline-flex h-8 items-center">Projects</span>
        </AnimateHeight>
        <a
          v-for="link in projectLinks"
          :key="link.label"
          href="#"
          class="btn btn-text justify-start gap-1.5 overflow-hidden px-4 py-1.75 font-normal text-nowrap transition-all group-data-[open=false]:px-1.75"
        >
          <Icon class="shrink-0" size="20" :name="link.icon" />
          <span class="truncate opacity-0 transition-opacity duration-200 group-data-[open=true]:opacity-100">{{ link.label }}</span>
        </a>
      </div>
    </div>
    <!-- footer -->
    <div class="mt-auto flex flex-center border-t border-elevated">
      <button class="flex w-full flex-center p-3" @click="$emit('toggle')">
        <Icon
          class="text-lg transition-transform duration-300 group-data-[open=true]:rotate-180"
          name="mdi:chevron-left"
        />
      </button>
    </div>
  </div>
</template>
