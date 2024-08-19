<script setup lang="ts">
</script>

<template>
  <div class="grid place-items-center px-4 py-16 h-dvh">
    <div
      class="grid place-items-center gap-12 xl:(grid-cols-[auto_1fr] max-w-7xl gap-x-24 gap-y-4) sm:gap-16"
    >
      <!-- header -->
      <div
        :class="
          clsx(
            'flex max-w-md flex-col items-center text-center xl:text-left',
            'xl:(col-start-2 row-span-2 row-start-3 grid max-w-none grid-cols-[auto_1fr] grid-rows-subgrid gap-4)',
          )
        "
      >
        <EpicStackLogo
          class="size-20 animate-slide-top xl:animate-slide-left xl:![animation-delay:0.5s]"
        />
        <h1
          :class="
            clsx(
              'mt-6 text-4xl font-medium sm:text-4.5xl md:(mt-8 text-5xl) lg:text-5.5xl xl:mt-0',
              'animate-slide-top ![animation-delay:0.3s] xl:(animate-slide-left ![animation-delay:0.8s])',
            )
          "
        >
          The <span class="text-highlight">Epic</span> Stack
        </h1>
        <p
          class="text-slate-60 mt-4 animate-slide-top ![animation-delay:0.8s] xl:(col-span-2 mt-0 animate-slide-left) sm:(mt-6 text-lg) md:text-xl !xl:[animation-delay:1.3s]"
        >
          Check the
          <a
            href="#"
            class="text-black underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-highlight"
          >Getting Started</a>
          guide file for how to get your project off the ground!
        </p>
      </div>
      <Logos />
    </div>
  </div>
</template>
