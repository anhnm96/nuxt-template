<script setup lang="ts">
function logError(e: any) {
  console.error(e)
}
</script>

<template>
  <NuxtErrorBoundary @error="logError">
    <div class="py-2 text-center">
      <InputText />
    </div>
    <NuxtPage />
    <AppDialog />
  </NuxtErrorBoundary>
</template>
