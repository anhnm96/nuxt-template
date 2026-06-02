<script setup lang="ts">
const { width, height } = useWindowSize()
</script>

<template>
  <div class="pointer-events-none fixed bottom-1 left-1 z-50 flex flex-col flex-center gap-1 rounded-full p-3 text-xs font-medium uppercase lg:flex-row">
    <div>
      {{ width }} x {{ height }}
    </div>
    <div class="block sm:hidden">
      xs
    </div>
    <div class="hidden sm:block md:hidden">
      sm
    </div>
    <div class="hidden md:block lg:hidden">
      md
    </div>
    <div class="hidden lg:block xl:hidden">
      lg
    </div>
    <div class="hidden xl:block 2xl:hidden">
      xl
    </div>
    <div class="hidden 2xl:block">
      2xl
    </div>
  </div>
</template>
