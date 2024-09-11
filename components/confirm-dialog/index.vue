<script lang="ts" setup>
const store = useDialogStore()
const showInfo = computed(() => store.componentName === 'info')
const showWarn = computed(() => store.componentName === 'warn')
</script>

<template>
  <div v-lazy-show="showInfo">
    <LazyConfirmDialogInfo
      :open="showInfo"
      v-bind="store.props"
    />
  </div>
  <div v-lazy-show="showWarn">
    <LazyConfirmDialogWarn
      :open="showWarn"
      v-bind="store.props"
    />
  </div>
</template>
