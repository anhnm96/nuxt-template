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
  <div class="contain-inline-size flex flex-wrap gap-4">
    <div
      v-for="(item, index) in list"
      :key="index"
      class="max-w-full flex items-center rounded-lg bg-abd px-4 py-2 gap-1"
    >
      <p class="flex-grow truncate">
        {{ getContent(item) }}
      </p>
      <button
        type="button"
        class="btn translate-x-1/4 p-1 rounded-full hover:bg-black/10"
        @click="handleRemoveSelectedItem(item)"
      >
        <Icon class="" name="ph:x-bold" />
      </button>
    </div>
  </div>
</template>
