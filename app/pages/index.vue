<script setup lang="ts">
const options = ['light', 'dark', 'ocean', 'rainforest'] as const

const colorMode = useColorMode()

async function toggle(event: Event) {
  /**
   * Return early if View Transition API is not supported
   * or user prefers reduced motion
   */
  if (!document.startViewTransition
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    colorMode.preference = (event.target as HTMLSelectElement).value
    return
  }

  await document.startViewTransition(() => {
    colorMode.preference = (event.target as HTMLSelectElement).value
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
</script>

<template>
  <div class="grid h-dvh place-items-center bg-primary-500 px-4 py-16">
    <div class="absolute top-10 right-10 flex gap-2">
      <select
        v-show="!$colorMode.unknown"
        :value="$colorMode.preference" class="rounded bg-primary-600 px-4 py-2 text-primary-100 transition hover:bg-primary-700"
        @change="toggle"
      >
        <option v-for="opt in options" :key="opt" :value="opt">
          {{ opt }}
        </option>
      </select>
      <select
        class="rounded bg-primary-600 px-4 py-2 text-primary-100 transition hover:bg-primary-700"
        :value="$i18n.locale"
        @change="$i18n.setLocale(($event.target as HTMLSelectElement).value as any)"
      >
        <option value="en">
          English
        </option>
        <option value="ja">
          日本語
        </option>
      </select>
    </div>
    <div
      class="grid place-items-center gap-12 sm:gap-16 xl:max-w-7xl xl:grid-cols-[auto_1fr] xl:gap-x-24 xl:gap-y-4"
    >
      <!-- header -->
      <div
        :class="
          clsx(
            'flex max-w-md flex-col items-center text-center xl:text-left',
            'xl:col-start-2 xl:row-span-2 xl:row-start-3 xl:grid xl:max-w-none xl:grid-cols-[auto_1fr] xl:grid-rows-subgrid xl:gap-4',
          )
        "
      >
        <EpicStackLogo
          class="size-20 animate-slide-top xl:animate-slide-left xl:![animation-delay:0.5s]"
        />
        <h1
          :class="
            clsx(
              'mt-6 text-4xl font-medium sm:text-4.5xl md:mt-8 md:text-5xl lg:text-5.5xl xl:mt-0',
              'animate-slide-top ![animation-delay:0.3s] xl:animate-slide-left xl:![animation-delay:0.8s]',
            )
          "
        >
          The <span class="text-highlight">Epic</span> Stack
        </h1>
        <p
          class="text-slate-60 !xl:[animation-delay:1.3s] mt-4 animate-slide-top ![animation-delay:0.8s] sm:mt-6 sm:text-lg md:text-xl xl:col-span-2 xl:mt-0 xl:animate-slide-left"
        >
          Check the
          <a
            href="#"
            class="text-black underline hover:no-underline focus:ring-2 focus:ring-highlight focus:outline-hidden"
          >Getting Started</a>
          guide file for how to get your project off the ground!
        </p>
      </div>
      <Logos />
    </div>
  </div>
</template>

<style>
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}
</style>
