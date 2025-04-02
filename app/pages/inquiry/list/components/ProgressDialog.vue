<script setup lang="ts">
import type { ReportStatus } from '../types'
import Dialog from '~/components/dialog/Dialog.vue'
import DialogPanel from '~/components/dialog/DialogPanel.vue'
import { PAGE_SIZE_DEFAULT_VALUE, PAGE_SIZE_OPTIONS } from '~/constants/pagination'
import { getInquiryProgressHistory } from '~/services/inquiries'
import { INQUIRY_PROGRESS_COLUMN, INQUIRY_PROGRESS_CONTENT, INQUIRY_PROGRESS_DIALOG_SORT_BY } from '../constants'
import DetailStatus from './DetailStatus.vue'
import Status from './Status.vue'

const props = defineProps<{ inquiryId: number, ticketNo: number, statusList: ReportStatus[] }>()

defineEmits<{
  afterLeave: []
  close: []
}>()

const { t } = useI18n()

const sort = ref(INQUIRY_PROGRESS_DIALOG_SORT_BY.CREATED_AT__DESC)
const orderOptions = computed(
  () => Object.entries(INQUIRY_PROGRESS_DIALOG_SORT_BY)
    .map(([key, value]) => ({
      label: t(`report_inquiry_management_list.progress_dialog.${key.toLowerCase()}`),
      value,
    })),
)

function handleChangeSortOrder() {
  // refetch({ page: currentPage.value })
}

const pageSize = ref(PAGE_SIZE_DEFAULT_VALUE)
const pageSizeOptions = computed(() => PAGE_SIZE_OPTIONS.map(i => (({
  label: t('filter_page_size', { count: i }),
  value: i,
}))))

function handleChangePageSize() {
  // triggerFetchData({ page: 0 })
}

// const DEFAULT_WIDTHS = {
//   [REPORT_INQUIRY_PROGRESS_COLUMN.ORDER]: 50,
//   [REPORT_INQUIRY_PROGRESS_COLUMN.PROCESS_CONTENT]: 150,
//   [REPORT_INQUIRY_PROGRESS_COLUMN.STATUS]: 170,
//   [REPORT_INQUIRY_PROGRESS_COLUMN.DETAIL_STATUS]: 150,
//   [REPORT_INQUIRY_PROGRESS_COLUMN.STATUS_CHANGE_DATE]: 150,
//   [REPORT_INQUIRY_PROGRESS_COLUMN.ANSWER_DATE]: 150,
//   [REPORT_INQUIRY_PROGRESS_COLUMN.ADVISER]: 200,
//   [REPORT_INQUIRY_PROGRESS_COLUMN.MEMO]: 250,
// };

// TODO: use infinite query
const { data, isLoading } = useQuery({
  key: () => ['inquiries', props.inquiryId, 'history'],
  query: () => getInquiryProgressHistory(props.inquiryId),
  initialData: () => ({
    list: [],
    total: 0,
    skip: 0,
    limit: 0,
  }),
})

const headers = Object.values(INQUIRY_PROGRESS_COLUMN)
</script>

<template>
  <Dialog v-slot="{ setClose }" @after-leave="$emit('afterLeave')">
    <div class="h-full flex items-end justify-center px-4 sm:items-center sm:p-0">
      <DialogPanel class="relative w-250 inline-block overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
        <div class="flex items-center justify-between bg-primary px-6 py-1.5 text-white">
          <h3 class="text-lg font-medium">
            {{ t('report_inquiry_management_list.progress_dialog.header') }}
          </h3>
          <div class="float-end -mr-2.5">
            <button
              type="button"
              class="rounded-full btn btn-icon text-white hover:bg-white/20"
              @click="setClose();$emit('close')"
            >
              <span class="sr-only">Close</span>
              <Icon class="text-xl" name="ph:x-bold" />
            </button>
          </div>
        </div>
        <div class="p-6">
          <div class="flex items-end justify-between">
            <h2 class="font-medium">
              {{ t('report_inquiry_management_list.search_form.inquiry_number') }}: {{ ticketNo }}
            </h2>
            <div class="flex gap-4">
              <!-- change sort order -->
              <Select
                v-model="sort"
                option-label="label"
                option-value="value"
                class="min-w-40"
                :scroll-height="orderOptions.length > 6 ? '18.5rem' : '19rem'"
                :options="orderOptions"
                @update:model-value="handleChangeSortOrder"
              />
              <!-- change page size -->
              <Select
                v-model="pageSize"
                option-label="label"
                option-value="value"
                class="min-w-30"
                :scroll-height="pageSizeOptions.length > 6 ? '18.5rem' : '19rem'"
                :options="pageSizeOptions"
                @update:model-value="handleChangePageSize"
              />
            </div>
          </div>
          <div class="overflow-auto mt-4">
            <table class="data-table">
              <thead>
                <tr>
                  <th v-for="header in headers" :key="header">
                    {{ header }}
                  </th>
                </tr>
              </thead>
              <td v-if="isLoading" :colspan="headers.length + 1" class="py-2">
                <Spinner class="mx-auto text-3xl text-primary" />
              </td>
              <tbody v-else-if="data">
                <tr v-for="(item, index) in data.list" :key="index">
                  <!-- index -->
                  <td>
                    {{ item.no }}
                  </td>
                  <!-- process content -->
                  <td>
                    <p class="line-clamp-2 break-all" :class="{ 'text-invalid': item.changeStatusCode === INQUIRY_PROGRESS_CONTENT.SENT_ANSWER }">
                      {{ item.changeStatus }}
                    </p>
                  </td>
                  <!-- status -->
                  <td>
                    <template v-if="sort === INQUIRY_PROGRESS_DIALOG_SORT_BY.CREATED_AT__DESC">
                      <span
                        v-if="item.status === data.list[index + 1]?.status
                          && item.statusDetail === data.list[index + 1]?.statusDetail"
                      >-</span>
                      <Status
                        v-else
                        :list="statusList"
                        :status="item.status"
                      />
                    </template>
                    <template v-else>
                      <span
                        v-if="item.status === data.list[index - 1]?.status
                          && item.statusDetail === data.list[index - 1]?.statusDetail"
                      >-</span>
                      <Status
                        v-else
                        :list="statusList"
                        :status="item.status"
                      />
                    </template>
                  </td>
                  <!-- detail status -->
                  <td>
                    <template v-if="sort === INQUIRY_PROGRESS_DIALOG_SORT_BY.CREATED_AT__DESC">
                      <span
                        v-if="item.status === data.list[index + 1]?.status
                          && item.statusDetail === data.list[index + 1]?.statusDetail"
                      >-</span>
                      <DetailStatus
                        v-else
                        :list="statusList"
                        :status="item.status"
                        :detail-status="item.statusDetail"
                      />
                    </template>
                    <template v-else>
                      <span
                        v-if="item.status === data.list[index - 1]?.status
                          && item.statusDetail === data.list[index - 1]?.statusDetail"
                      >-</span>
                      <DetailStatus
                        v-else
                        :list="statusList"
                        :status="item.status"
                        :detail-status="item.statusDetail"
                      />
                    </template>
                  </td>
                  <!-- status modify date -->
                  <td>
                    <p v-if="item.statusModifyAt" class="line-clamp-2 break-all">
                      <DateTime
                        :date="item.statusModifyAt"
                        show-time
                      />
                    </p>
                    <span v-else>-</span>
                  </td>
                  <!-- answer date -->
                  <td>
                    <p v-if="item.answerCreatedAt" class="line-clamp-2 break-all">
                      <DateTime
                        :date="item.answerCreatedAt"
                        show-time
                      />
                    </p>
                    <span v-else>-</span>
                  </td>
                  <!-- adviser -->
                  <td>
                    <template v-if="item.adviserName || item.adviserId">
                      <p class="line-clamp-1 break-all">
                        {{ item.adviserName }}
                      </p>
                      <p class="line-clamp-1 break-all">
                        ({{ item.adviserId }})
                      </p>
                    </template>
                    <span v-else>-</span>
                  </td>
                  <!-- memo -->
                  <td>
                    <p class="line-clamp-2 w-full whitespace-pre-line break-all">
                      {{ item.memo || '-' }}
                    </p>
                    <Tooltip v-if="item.memo">
                      <div class="max-w-100 border border-abd rounded-3xl bg-white shadow-1">
                        <p class="whitespace-pre-line break-all px-4 py-2">
                          {{ item.memo }}
                        </p>
                      </div>
                    </Tooltip>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogPanel>
    </div>
  </Dialog>
</template>
