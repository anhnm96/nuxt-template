<script setup lang="ts">
import { Toaster } from 'vue-sonner'

function logError(e: any) {
  console.error(e)
}
</script>

<template>
  <NuxtErrorBoundary @error="logError">
    <NuxtPage />
    <div id="teleport" />
    <AppDialog />
    <Toaster expand position="top-right" />
  </NuxtErrorBoundary>
</template>
