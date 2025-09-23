<script setup lang="ts">
import { omit } from 'lodash-es'
import colors from 'tailwindcss/colors'
import Dropdown from '~/components/Dropdown.vue'

const appConfig = useAppConfig()
const neutralColors = ['slate', 'gray', 'zinc', 'neutral', 'stone']
const colorsToOmit = ['inherit', 'current', 'transparent', 'black', 'white', ...neutralColors]
const primaryColors = Object.keys(omit(colors, colorsToOmit as any))
const primary = computed({
  get() {
    return appConfig.theme.colors.primary
  },
  set(option) {
    appConfig.theme.colors.primary = option
    window.localStorage.setItem('nuxt-ui-primary', appConfig.theme.colors.primary)
  },
})

const colorMode = useColorMode()

async function toggle(event: Event, color: string) {
  /**
   * Return early if View Transition API is not supported
   * or user prefers reduced motion
   */
  if (!document.startViewTransition
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    colorMode.preference = color
    return
  }

  await document.startViewTransition(() => {
    colorMode.preference = color
  }).ready

  const { top, left, width, height } = (event.target as HTMLSelectElement).getBoundingClientRect()
  const x = left + width / 2
  const y = top + height / 2
  const right = window.innerWidth - left
  const bottom = window.innerHeight - top
  const maxRadius = Math.hypot(
    Math.max(left, right),
    Math.max(top, bottom),
  )

  document.documentElement.animate(
    {
      clipPath: [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${maxRadius}px at ${x}px ${y}px)`,
      ],
    },
    {
      duration: 500,
      easing: 'ease-in-out',
      pseudoElement: '::view-transition-new(root)',
    },
  )
}

const modes = [
  { label: 'light', icon: 'lucide:sun' },
  { label: 'dark', icon: 'lucide:moon' },
  { label: 'system', icon: 'lucide:monitor' },
]
</script>

<template>
  <Dropdown>
    <button class="btn p-1.5 shadow-none [--btn-color:var(--color-primary-500)] hover:bg-elevated">
      <Icon size="20" name="lucide:swatch-book" />
    </button>
    <template #popover>
      <div class="flex w-72 flex-col gap-4 px-6 py-4">
        <!-- theme -->
        <fieldset class="flex flex-col gap-2">
          <legend class="text-xs font-semibold">
            Primary
          </legend>
          <div class="-mx-2 mt-2 grid grid-cols-3 gap-1">
            <button class="btn items-center justify-start gap-1.5 px-2.5 py-1.5 text-[11px] capitalize shadow-none ring ring-elevated ">
              <span class="inline-block size-2 rounded-full bg-black dark:bg-white" />
              <span class="truncate">Black</span>
            </button>
            <button
              v-for="color in primaryColors" :key="color" class="btn items-center justify-start gap-1.5 px-2.5 py-1.5 text-[11px] capitalize shadow-none ring ring-elevated "
              :class="[colorMode.preference === color ? 'bg-elevated' : 'hover:bg-elevated/50']"
              @click="primary = color"
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
        <!-- theme -->
        <fieldset class="flex flex-col gap-2">
          <legend class="text-xs font-semibold">
            Theme
          </legend>
          <div class="-mx-2 mt-2 grid grid-cols-3 gap-1">
            <button
              v-for="m in modes" :key="m.label"
              class="btn items-center justify-start gap-1.25 border border-elevated px-2.5 py-1.5 text-[11px] capitalize shadow-none hover:bg-elevated/50"
              :class="[colorMode.preference === m.label ? 'bg-elevated' : 'hover:bg-elevated/50']"
              @click="toggle($event, m.label)"
            >
              <Icon size="16" :name="m.icon" />
              <span>{{ m.label }}</span>
            </button>
          </div>
        </fieldset>
      </div>
    </template>
  </Dropdown>
</template>
