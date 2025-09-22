<script setup lang="ts">
</script>

<template>
  <header class="border-default bg-default/75 sticky top-0 z-50 h-16 border-b backdrop-blur">
    <div class="wrapper flex h-full items-center justify-between gap-3">
      <div class="flex min-w-0 items-center lg:flex-1">
        <NuxtLink to="/" aria-label="Home">
          <EpicStackLogo class="size-6" />
        </NuxtLink>
      </div>
      <div class="flex items-center justify-end gap-1.5 lg:flex-1">
        <ThemePicker />
      </div>
    </div>
  </header>
</template>
