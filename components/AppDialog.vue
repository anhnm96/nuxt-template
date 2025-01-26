<script lang="ts" setup>
const dialogStore = useDialogStore()

const show = computed(() => dialogStore.dialogs.length > 0)
</script>

<template>
  <div v-if="show">
    <component
      :is="dialog.component"
      v-for="dialog in dialogStore.dialogs"
      :key="dialog.id"
      open
      v-bind="dialog.props"
      @close="dialog.resolve($event)"
      @after-leave="dialogStore.closeDialog(dialog.id!)"
    />
  </div>
</template>
