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
  {
    name: 'Schedule (WIP)',
    path: '/schedule',
  },
  {
    name: 'Components',
    path: '/demo',
  },
]
</script>

<template>
  <div class="p-wrapper pointer-events-none fixed top-0 right-0 left-0 z-[9999]">
    <div class="wrapper flex items-center">
      <div class="pointer-events-auto ms-auto flex gap-1.5">
        <Dropdown>
          <button class="btn btn-text-primary relative gap-1 pr-6">
            Templates
            <Icon class="absolute right-1.5" name="lucide:chevron-down" />
          </button>
          <template #popover="{ toggleShow }">
            <ul>
              <li v-for="template in templates" :key="template.path">
                <NuxtLink
                  :to="template.path" class="btn btn-text w-full justify-start"
                  @click="toggleShow(false)"
                >
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
