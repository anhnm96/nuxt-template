<script setup lang="ts">
import { omit } from 'lodash-es'
import colors from 'tailwindcss/colors'
import Dropdown from '~/components/Dropdown.vue'

const neutralColors = ['slate', 'gray', 'zinc', 'neutral', 'stone']
const colorsToOmit = ['inherit', 'current', 'transparent', 'black', 'white', ...neutralColors]
const primaryColors = Object.keys(omit(colors, colorsToOmit as any))
const primary = shallowRef()
onMounted(() => {
  primary.value = document.documentElement.getAttribute('data-theme')
})

function setPrimary(color: string) {
  primary.value = color
  document.documentElement.setAttribute('data-theme', color)

  // Get the color palette for the selected color
  const colorPalette = colors[color as keyof typeof colors]

  if (colorPalette && typeof colorPalette === 'object') {
    // Set CSS custom properties for all color shades
    Object.entries(colorPalette).forEach(([shade, corlorValue]) => {
      document.documentElement.style.setProperty(`--color-primary-${shade}`, corlorValue)
      if (shade === '500') {
        document.documentElement.style.setProperty('--color-primary', corlorValue)
      }
    })
  }
}
</script>

<template>
  <Dropdown>
    <button class="btn p-1.5 shadow-none [--btn-color:var(--color-primary-500)] hover:bg-elevated">
      <Icon size="20" name="lucide:swatch-book" />
    </button>
    <template #popover>
      <div class="flex w-72 flex-col gap-4 px-6 py-4">
        <fieldset class="flex flex-col gap-2">
          <legend class="text-xs font-semibold">
            Theme
          </legend>
          <div class="-mx-2 mt-2 grid grid-cols-3 gap-1">
            <button class="btn items-center justify-start gap-1.5 px-2.5 py-1.5 text-[11px] capitalize shadow-none ring ring-elevated hover:bg-elevated/50">
              <span class="inline-block size-2 rounded-full bg-black dark:bg-white" />
              <span class="truncate">Black</span>
            </button>
            <button
              v-for="color in primaryColors" :key="color" class="btn items-center justify-start gap-1.5 px-2.5 py-1.5 text-[11px] capitalize shadow-none ring ring-elevated hover:bg-elevated/50"
              :class="[primary === color ? 'bg-elevated' : 'hover:bg-elevated/50']"
              @click="setPrimary(color)"
            >
              <span
                class="inline-block size-2 rounded-full bg-(--color-light)  dark:bg-(--color-dark)"
                :style="{
                  '--color-light': colors[color as keyof typeof colors]['500'],
                  '--color-dark': colors[color as keyof typeof colors]['400'],
                }"
              />
              <span class="truncate">{{ color }}</span>
            </button>
          </div>
        </fieldset>
      </div>
    </template>
  </Dropdown>
</template>
