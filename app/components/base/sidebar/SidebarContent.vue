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
    <!-- header -->
    <header class="px-6 pt-2">
      <div class="flex items-center gap-1 text-xl font-bold">
        <Icon class="navbar-text shrink-0" size="24" name="arcticons:openai-chatgpt" />
        <h1 class="navbar-text">
          Heading
        </h1>
      </div>
      <button
        v-if="!open"
        title="open sidebar"
        aria-label="open sidebar"
        class="btn btn-text absolute inset-x-0 top-0.75" @click="$emit('toggle', true)"
      >
        <Icon size="22" name="tabler:arrow-bar-right" />
      </button>
      <button
        v-else
        title="close sidebar"
        aria-label="close sidebar"
        class="btn btn-text absolute top-0.75 right-0 pr-0" @click="$emit('toggle', false)"
      >
        <Icon size="22" name="tabler:arrow-bar-left" />
      </button>
    </header>
    <div data-sidebar="content" class="flex w-(--sidebar-width-open) flex-1 flex-col overflow-x-hidden overflow-y-auto px-2">
      <!-- general -->
      <nav aria-label="General" class="mt-2 flex flex-col items-stretch">
        <a
          v-for="link in generalLinks"
          :key="link.label"
          href="#"
          class="btn btn-text justify-start gap-1.5 overflow-hidden px-4 py-1.75 font-normal transition-all group-data-[open=false]:px-1.75"
        >
          <Icon class="shrink-0" size="20" :name="link.icon" />
          <span class="navbar-text">{{ link.label }}</span>
        </a>
      </nav>
      <!-- group -->
      <nav aria-label="Projects" data-sidebar="group" class="flex flex-col">
        <AnimateHeight :data-open="open" class="px-2 text-xs font-medium text-muted">
          <span class="inline-flex h-8 items-center">Projects</span>
        </AnimateHeight>
        <a
          v-for="link in projectLinks"
          :key="link.label"
          href="#"
          class="btn btn-text justify-start gap-1.5 overflow-hidden px-4 py-1.75 font-normal transition-all group-data-[open=false]:px-1.75"
        >
          <Icon class="shrink-0" size="20" :name="link.icon" />
          <span class="navbar-text">{{ link.label }}</span>
        </a>
      </nav>
    </div>
    <!-- footer -->
    <footer class="mt-auto flex flex-center border-t border-elevated">
      <button class="flex w-full flex-center p-3" aria-label="Toggle sidebar" @click="$emit('toggle')">
        <Icon
          class="text-lg transition-transform duration-300 group-data-[open=true]:rotate-180"
          name="mdi:chevron-left"
        />
      </button>
    </footer>
  </div>
</template>

<style scoped>
@reference '#main.css';

.navbar-text {
  @apply truncate opacity-0 transition-opacity duration-200 group-data-[open=true]:opacity-100;
}

.router-link-active {
  @apply bg-list-item-bg/80;
}
</style>
