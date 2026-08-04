<script setup lang="ts">
import { PiniaColadaDevtools } from '@pinia/colada-devtools'
import { Toaster } from 'vue-sonner'

function logError(e: any) {
  console.error(e)
}
const colorMode = useColorMode()
</script>

<template>
  <NuxtErrorBoundary @error="logError">
    <Layout />
    <NuxtPage />
    <div id="teleport" />
    <ClientOnly>
      <AppDialog />
      <Toaster expand position="bottom-right" :theme="colorMode.value as any" />
      <DevOnly>
        <TailwindIndicator />
      </DevOnly>
    </ClientOnly>
    <div class="popovers" />
    <PiniaColadaDevtools />
  </NuxtErrorBoundary>
</template>
