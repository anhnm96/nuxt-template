<script lang="ts" setup>
const store = useDialogStore()
</script>

<template>
  <LazyConfirmDialogInfo
    v-if="store.componentName === 'info'"
    :resolve="store.resolve"
    v-bind="store.props"
  />
  <LazyConfirmDialogWarn
    v-else-if="store.componentName === 'warn'"
    :resolve="store.resolve"
    v-bind="store.props"
  />
</template>
