<script lang="ts" setup>
const store = useDialogStore()
</script>

<template>
  <LazyConfirmDialogInfo
    v-if="store.componentName === 'info'"
    v-bind="store.props"
  />
  <LazyConfirmDialogWarn
    v-else-if="store.componentName === 'warn'"
    v-bind="store.props"
  />
</template>
