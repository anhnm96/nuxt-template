<script setup lang="ts" generic="T">
const props = withDefaults(defineProps<{
  list: T[]
  getContent?: (item: T) => any
}>(), {
  getContent: (item: T) => item,
})

const emit = defineEmits<{
  removeInquiry: [item: T]
}>()

const { t } = useI18n()
const dialogStore = useDialogStore()
function handleRemoveSelectedItem(item: T) {
  if (props.list.length === 1) {
    dialogStore.showAlert({ description: t('report_inquiry_management_list.assign_dialog.alert_remove_item') })

    return
  }

  emit('removeInquiry', item)
}
</script>

<template>
  <div class="flex flex-wrap gap-4 contain-inline-size">
    <div
      v-for="(item, index) in list"
      :key="index"
      class="flex max-w-full items-center gap-1 rounded-lg bg-abd px-4 py-2"
    >
      <p class="grow truncate">
        {{ getContent(item) }}
      </p>
      <button
        type="button"
        class="btn translate-x-1/4 rounded-full p-1 hover:bg-black/10"
        @click="handleRemoveSelectedItem(item)"
      >
        <Icon class="" name="ph:x-bold" />
      </button>
    </div>
  </div>
</template>
