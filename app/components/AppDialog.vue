<script lang="ts" setup>
const dialogStore = useDialogStore()

const show = computed(() => dialogStore.dialogs.length > 0)

useEventListener('keydown', (e) => {
  if (e.key !== 'Escape'
    || !show.value
    || (e.target as HTMLElement)?.ariaExpanded === 'true'
    || dialogStore.dialogs.at(-1)?.props.closeOnEscape === false) {
    return
  }

  e.stopImmediatePropagation()
  dialogStore.dialogs.at(-1)!.props.open = false
}, { capture: true })

// TODO: clear dialogs when navigating
</script>

<template>
  <div v-lazy-show="show">
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
