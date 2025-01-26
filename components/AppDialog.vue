<script lang="ts" setup>
const dialogStore = useDialogStore()

const show = computed(() => dialogStore.dialogs.length > 0)

useEventListener('keydown', (e) => {
  if (e.key === 'Escape' && dialogStore.dialogs.at(-1)?.props.closeOnEscape === undefined) {
    dialogStore.dialogs.at(-1)!.props.open = false
  }
})
</script>

<template>
  <div v-if="show">
    <component
      :is="dialog.component"
      v-for="dialog in dialogStore.dialogs"
      :key="dialog.id"
      v-bind="dialog.props"
      @close="dialog.resolve($event)"
      @after-leave="dialogStore.closeDialog(dialog.id!)"
    />
  </div>
</template>
