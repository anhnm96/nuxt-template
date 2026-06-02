<script setup lang="ts">
import { Toaster } from 'vue-sonner'

function logError(e: any) {
  console.error(e)
}
</script>

<template>
  <NuxtErrorBoundary @error="logError">
    <Layout />
    <NuxtPage />
    <div id="teleport" />
    <ClientOnly>
      <AppDialog />
      <Toaster expand position="top-right" />
      <DevOnly>
        <TailwindIndicator />
      </DevOnly>
    </ClientOnly>
  </NuxtErrorBoundary>
</template>
