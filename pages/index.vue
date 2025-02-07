<script setup lang="ts">
const options = ['light', 'dark', 'ocean', 'rainforest'] as const
</script>

<template>
  <div class="grid place-items-center bg-primary-500 px-4 py-16 h-dvh">
    <div class="absolute right-10 top-10 flex gap-2">
      <select
        v-show="!$colorMode.unknown"
        v-model="$colorMode.preference" class="rounded bg-primary-600 px-4 py-2 text-primary-100 transition hover:bg-primary-700"
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
      class="grid place-items-center gap-12 xl:grid-cols-[auto_1fr] xl:max-w-7xl sm:gap-16 xl:gap-x-24 xl:gap-y-4"
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
          class="text-slate-60 mt-4 animate-slide-top ![animation-delay:0.8s] xl:col-span-2 sm:mt-6 xl:mt-0 xl:animate-slide-left md:text-xl sm:text-lg !xl:[animation-delay:1.3s]"
        >
          Check the
          <a
            href="#"
            class="text-black underline hover:no-underline focus:outline-hidden focus:ring-2 focus:ring-highlight"
          >Getting Started</a>
          guide file for how to get your project off the ground!
        </p>
      </div>
      <Logos />
    </div>
  </div>
</template>
