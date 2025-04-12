<script setup lang="ts">
import { FormContextKey } from 'vee-validate'
import { injectProductsRootContext } from '../index.vue'
import { injectChangeStatusAnswerContext } from './ChangeStatusAnswerDialog.vue'

const props = defineProps<{ category: string }>()

const formContext = inject(FormContextKey)!
const { t } = useI18n()

const {
  searchFormCodes,
} = injectProductsRootContext()

const {
  formId,
  maxlength,
  formValue,
  activeTab,
  statusOptions,
} = injectChangeStatusAnswerContext()

const detailStatusOptions = computed(() => {
  if (!searchFormCodes.value) {
    return []
  }

  const selectedStatus = searchFormCodes.value.reportStatuses.find(i => i.code === formValue.value[activeTab.value]?.status)

  // status does not have detail status
  if (!selectedStatus?.statusDetails?.length) {
    return []
  }

  // detail status is not related to report type
  if (!selectedStatus.statusDetails[0]?.reportTypeId) {
    return selectedStatus.statusDetails
  }

  // filter detail status by report type
  return selectedStatus.statusDetails.filter(i => i.reportTypeId === props.category)
})

watch(detailStatusOptions, (newValue, oldValue) => {
  // init detail status on first mounted
  if (!oldValue) {
    if (!formValue.value[activeTab.value]?.detailStatus) {
      formValue.value[activeTab.value].detailStatus = newValue[0]?.code || ''
    }
  } else if (newValue) {
    // auto select first option when option list changed
    formValue.value[activeTab.value].detailStatus = newValue[0]?.code || ''
  }
}, { immediate: true })
</script>

<template>
  <h2 class="mt-4 font-medium">
    {{ t('report_inquiry_management_list.change_status_dialog.change_status') }}
  </h2>
  <div class="grid-table with-label mt-2 rounded-md">
    <!-- section status, detail status -->
    <div class="w-45">
      <Label required>
        {{ t('report_inquiry_management_list.change_status_dialog.status_detail_status') }}
      </Label>
    </div>
    <div class="flex gap-4">
      <!-- status -->
      <Select
        v-model="formValue[activeTab].status"
        class="w-60"
        :label-id="`status-${formId}`"
        option-label="name"
        option-value="code"
        :placeholder="t('game_dialog.placeholder_select')"
        :reset-filter-on-hide="false"
        :options="statusOptions"
        :scroll-height="statusOptions.length > 6 ? '18.5rem' : '19rem'"
        :filter="statusOptions.length > 6"
      />
      <!-- detail status -->
      <Select
        v-model="formValue[activeTab].detailStatus"
        class="w-60"
        :label-id="`detailStatus-${formId}`"
        option-label="name"
        option-value="code"
        :placeholder="detailStatusOptions.length === 0 ? '-' : t('game_dialog.placeholder_select')"
        :reset-filter-on-hide="false"
        :options="detailStatusOptions"
        :scroll-height="detailStatusOptions.length > 6 ? '18.5rem' : '19rem'"
        :filter="detailStatusOptions.length > 6"
      />
    </div>
    <!-- section memo -->
    <div>
      <Label :for="`memo-${formId}`">
        {{ t('report_inquiry_management_list.assign_dialog.memo') }}
      </Label>
    </div>
    <div>
      <div class="flex items-end gap-2">
        <div class="relative w-full">
          <Field
            :id="`memo__${formId}`"
            rows="3"
            :name="`${activeTab}.memo`" as="textarea"
            class="block resize-none max-w-4xl w-full border border-slate-300 rounded-md p-4 pr-7"
            :class="[!!formContext.errors.value[`${activeTab}.memo`] && 'invalid']"
          />
          <button
            v-if="formContext.values[activeTab].memo.length > 0"
            class="absolute right-0 top-0 bottom-0 p-0 pr-2 inline-flex items-center"
            @click="formContext.values[activeTab].memo = ''"
          >
            <Icon name="ph:x-circle" size="18" />
          </button>
        </div>
        <!-- characters counter -->
        <CharacterCounter :value="formContext.values[activeTab].memo" :max-length="maxlength.memo" />
      </div>
      <!-- memo description -->
      <ul class="list-bullet mt-2">
        <li class="mt-1 text-xs text-slate-400">
          {{ t('report_inquiry_management_list.change_status_dialog.memo_description') }}
        </li>
      </ul>
    </div>
  </div>
</template>
