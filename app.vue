<script setup lang="ts">
function logError(e: any) {
  console.error(e)
}
</script>

<template>
  <NuxtErrorBoundary @error="logError">
    <NuxtPage />
    <ConfirmDialog />
  </NuxtErrorBoundary>
</template>
