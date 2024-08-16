<script setup lang="ts">
const { openAlert } = useDialogStore()

async function openWarnDialog() {
  const res = await openAlert('warn')
  console.log('res', res)
}
</script>

<template>
  <div class="asd m-2 bg-info p-8">
    <div
      class="grid place-items-center gap-12 xl:grid-cols-[auto_1fr] xl:max-w-7xl sm:gap-16 xl:gap-x-24 xl:gap-y-4 hover:(bg-green-200 text-lg)"
    >
      test
    </div>
    <p class="test">
      haha
    </p>
    <button @click="openAlert('info', { title: 'Payment successful', description: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Consequatur amet labore.' })">
      Open info
    </button>
    <button @click="openWarnDialog">
      Open warn
    </button>
    <TestDialog />
  </div>
  <ConfirmDialog />
</template>

<style>
</style>
