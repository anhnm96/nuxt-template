<script setup lang="ts">
import Dropdown from '~/components/Dropdown.vue'

const templates = [
  {
    name: 'Epic Stack',
    path: '/',
  },
  {
    name: 'Radiant',
    path: '/radiant',
  },
]
</script>

<template>
  <div class="p-wrapper fixed top-0 right-0 left-0 z-[9999]">
    <div class="wrapper flex items-center">
      <div class="ms-auto flex gap-1.5">
        <Dropdown>
          <button class="btn btn-text-primary relative gap-1 pr-6">
            Templates
            <Icon class="absolute right-1.5" name="lucide:chevron-down" />
          </button>
          <template #popover>
            <ul>
              <li v-for="template in templates" :key="template.path">
                <NuxtLink :to="template.path" class="btn btn-text w-full justify-start">
                  {{ template.name }}
                </NuxtLink>
              </li>
            </ul>
          </template>
        </Dropdown>
        <ToggleTheme />
        <ThemePicker />
      </div>
    </div>
  </div>
</template>
