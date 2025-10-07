<script lang="ts">
import type { ReportStatus, UpdateInquiryRequestBody } from '../types'
import * as v from 'valibot'
import Button from '~/components/Button.vue'
import Switch from '~/components/switch/Switch.vue'
import Tab from '~/components/tab/Tab.vue'
import TabIndicator from '~/components/tab/TabIndicator.vue'
import TabList from '~/components/tab/TabList.vue'
import TabPanel from '~/components/tab/TabPanel.vue'
import TabPanels from '~/components/tab/TabPanels.vue'
import Tabs from '~/components/tab/Tabs.vue'
import { updateStatusBulk } from '~/services/inquiries'
import { INQUIRY_STATUS_OPTIONS, REPORT_INQUIRY_CATEGORY_OPTIONS } from '../constants'
import { injectProductsRootContext } from '../index.vue'
import AnswerForm from './AnswerForm.vue'
import ChangeStatusForm from './ChangeStatusForm.vue'
import InquiryList from './InquiryList.vue'

const TAB = {
  REPORT_ACCOUNT_THEFT: 'bulkUpdateReportStatus',
  APPEAL: 'bulkUpdateObjectionStatus',
} as const

interface ChangeStatusAnswerContext {
  formId: string
  activeTab: Ref<ValueOf<typeof TAB>>
  maxlength: {
    memo: number
    bulkAnswerRequest: {
      answerTitle: number
      answerContent: number
    }
  }
  statusOptions: ComputedRef<ReportStatus[]>
}

export const [provideChangeStatusAnswerContext, injectChangeStatusAnswerContext]
  = createContext<ChangeStatusAnswerContext>('ChangeStatusAnswerDialog')
</script>

<script setup lang="ts">
const emit = defineEmits<{
  afterLeave: []
  close: [value?: boolean]
}>()

const { t } = useI18n()
const id = useId()

const maxlength = {
  memo: 100,
  bulkAnswerRequest: {
    answerTitle: 100,
    answerContent: 10000,
  },
}

const dialogStore = useDialogStore()
const showChangeStatusForm = ref(true)
const showAnswerForm = ref(true)

const {
  selectedItems,
  data: items,
  searchFormCodes,
  selectItem,
} = injectProductsRootContext()!

// inquiry list
const reportAccountTheftInquiryList = computed(() => items.value!.list.filter(i => i.reportDiv === REPORT_INQUIRY_CATEGORY_OPTIONS.THEFT && selectedItems.value.includes(i.seqNo)))
const reportAppealList = computed(() => items.value!.list.filter(i => i.reportDiv === REPORT_INQUIRY_CATEGORY_OPTIONS.APPEAL && selectedItems.value.includes(i.seqNo)))

// we may have 1-2 forms depending on the selected inquiries
const availableForms = computed<(typeof TAB)[keyof typeof TAB][]>(() => {
  const result = []

  if (reportAccountTheftInquiryList.value.length) {
    result.push(TAB.REPORT_ACCOUNT_THEFT)
  }

  if (reportAppealList.value.length) {
    result.push(TAB.APPEAL)
  }

  return result as any
})

const activeTab = ref<typeof availableForms.value[number]>(availableForms.value[0] as any)
const statusOptions = computed(() => {
  return searchFormCodes.value?.reportStatuses.filter(reportStatus =>
    ![INQUIRY_STATUS_OPTIONS.PENDING, INQUIRY_STATUS_OPTIONS.RECEIVED].includes(reportStatus.code as any),
  ) || []
})

const initialValues: UpdateInquiryRequestBody = {
  bulkUpdateReportStatus: {
    reportSeqNos: [],
    reportDiv: REPORT_INQUIRY_CATEGORY_OPTIONS.THEFT,
    status: statusOptions.value[0]!.code,
    detailStatus: '',
    memo: '',
    bulkAnswerRequest: {
      answerTemplateSeqNo: undefined,
      templateLanguageCode: undefined,
      answerTitle: '',
      answerContent: '',
    },
  },
  bulkUpdateObjectionStatus: {
    reportSeqNos: [],
    reportDiv: REPORT_INQUIRY_CATEGORY_OPTIONS.APPEAL,
    status: statusOptions.value[0]!.code,
    detailStatus: '',
    memo: '',
    bulkAnswerRequest: {
      answerTemplateSeqNo: undefined,
      templateLanguageCode: undefined,
      answerTitle: '',
      answerContent: '',
    },
  },
}

const tabSchema = v.object({
  reportDiv: v.pipe(v.string(), v.nonEmpty()),
  status: v.optional(v.string()),
  detailStatus: v.optional(v.string()),
  memo: v.pipe(v.string(), v.maxLength(maxlength.memo)),
  bulkAnswerRequest: v.optional(v.object({
    answerTemplateSeqNo: v.optional(v.number()),
    templateLanguageCode: v.optional(v.string()),
    answerTitle: v.pipe(v.string(), v.nonEmpty(), v.maxLength(maxlength.bulkAnswerRequest.answerTitle)),
    answerContent: v.pipe(v.string(), v.nonEmpty(), v.maxLength(maxlength.bulkAnswerRequest.answerContent)),
  })),
})

let schema: Record<string, any>

// truncate text fields if exceed max length
function handleTruncateFields(payload: UpdateInquiryRequestBody) {
  for (const formName of availableForms.value) {
    const form = payload[formName]

    truncateFields(form, maxlength)
    // if (getHTMLTextContentLength(form.bulkAnswerRequest.answerContent) > maxlength.answerContent) {
    //   form.bulkAnswerRequest.answerContent = truncateHtmlTextContent(form.bulkAnswerRequest.answerContent, maxlength.answerContent)
    // }
  }
}

const formRef = useTemplateRef('form')

function updateShowChangeStatusForm(value: boolean) {
  if (value) {
    for (const formName of availableForms.value) {
      formRef.value?.setValues({
        [formName]: {
          ...formRef.value.values[formName],
          status: statusOptions.value[0]!.code,
          detailStatus: '',
          memo: '',
        },
      })
    }
  } else {
    for (const formName of availableForms.value) {
      formRef.value?.setValues({
        [formName]: {
          ...formRef.value.values[formName],
          status: undefined,
          detailStatus: undefined,
          memo: undefined,
        },
      })
    }
  }
  showChangeStatusForm.value = value
}

function updateShowAnswerForm(value: boolean) {
  if (value) {
    for (const formName of availableForms.value) {
      formRef.value?.setValues({
        [formName]: {
          ...formRef.value.values[formName],
          bulkAnswerRequest: {
            answerTemplateSeqNo: undefined,
            templateLanguageCode: undefined,
            answerTitle: '',
            answerContent: '',
          },
        },
      })
    }
  } else {
    for (const formName of availableForms.value) {
      formRef.value?.setValues({
        [formName]: {
          ...formRef.value.values[formName],
          bulkAnswerRequest: undefined,
        },
      })
    }
  }
  showAnswerForm.value = value
}

if (reportAccountTheftInquiryList.value.length && reportAppealList.value.length) {
  schema = toTypedSchema(v.object({
    bulkUpdateReportStatus: tabSchema,
    bulkUpdateObjectionStatus: tabSchema,
  }))
} else {
  if (!reportAccountTheftInquiryList.value.length) {
    initialValues.bulkUpdateReportStatus = undefined
  } else {
    schema = toTypedSchema(v.object({
      bulkUpdateReportStatus: tabSchema,
    }))
  }

  if (!reportAppealList.value.length) {
    initialValues.bulkUpdateObjectionStatus = undefined
  } else {
    schema = toTypedSchema(v.object({
      bulkUpdateObjectionStatus: tabSchema,
    }))
  }
}

function focusField(fieldName: string) {
  const el = (formRef.value!.$el as HTMLElement).querySelector<HTMLElement>(`[name="${fieldName}"]`)
  if (!el) return
  el.focus()
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function onInvalidSubmit({ errors }: any) {
  // focus first invalid basic field
  for (const formName of availableForms.value) {
    activeTab.value = formName
    const fieldNamesOrder = [`${formName}.bulkAnswerRequest.answerTitle`, `${formName}bulkAnswerRequest.answerContent`]
    const invalidFieldNames = Object.keys(errors)
    const firstInvalidFieldName = fieldNamesOrder.find(field => invalidFieldNames.includes(field))
    if (firstInvalidFieldName) {
      nextTick(() => focusField(firstInvalidFieldName))
      break
    }
  }
};

async function handleSubmit(payload: UpdateInquiryRequestBody, ctx: any) {
  console.log('values', payload)

  if (!availableForms.value.includes(TAB.REPORT_ACCOUNT_THEFT)) {
    delete payload.bulkUpdateReportStatus
  }

  if (!availableForms.value.includes(TAB.APPEAL)) {
    delete payload.bulkUpdateObjectionStatus
  }

  for (const formName of availableForms.value) {
    if (!showChangeStatusForm.value) {
      delete payload[formName]!.status
      delete payload[formName]!.detailStatus
      delete payload[formName]!.memo
    }

    if (!showAnswerForm.value) {
      delete payload[formName]!.bulkAnswerRequest
    }
  }

  if (reportAccountTheftInquiryList.value.length) {
    payload.bulkUpdateReportStatus!.reportSeqNos = reportAccountTheftInquiryList.value.map(i => i.seqNo)
  }

  if (reportAppealList.value.length) {
    payload.bulkUpdateObjectionStatus!.reportSeqNos = reportAppealList.value.map(i => i.seqNo)
  }

  if (showAnswerForm.value) {
    const result = await dialogStore.showConfirm({
      description: [t('report_inquiry_management_list.change_status_dialog.confirm_send_answer')],
      confirmLabel: t('report_inquiry_management_list.change_status_dialog.send_answer'),
    })

    if (!result) return
  }

  try {
    await updateStatusBulk(payload)

    // show success message
    if (showChangeStatusForm.value && showAnswerForm.value) {
      dialogStore.showAlert({
        description: [t('report_inquiry_management_list.change_status_dialog.change_status_success'), t('report_inquiry_management_list.change_status_dialog.send_answer_success')],
        severity: 'success',
      })
    } else if (showChangeStatusForm.value) {
      dialogStore.showAlert({
        description: [t('report_inquiry_management_list.change_status_dialog.change_status_success')],
        severity: 'success',
      })
    } else {
      dialogStore.showAlert({
        description: [t('report_inquiry_management_list.change_status_dialog.send_answer_success')],
        severity: 'success',
      })
    }
  } catch (error: any) {
    if (error.status !== 0) {
      await dialogStore.showAlert({
        description: [t('messages.save_fail')],
        severity: 'error',
      })

      return
    }

    if (error.data?.fails?.length) {
      dialogStore.showAlert({
        description: [t('report_inquiry_management_list.change_status_dialog.update_include_fail'), ...error.data.fails.map((i: string) => `- ${i}`)],
        severity: 'success',
      })

      return
    }
  }

  emit('close', true)
}

// #region submit button
const submitButtonLabel = computed(() => {
  if (showChangeStatusForm.value && showAnswerForm.value) {
    return `${t('report_inquiry_management_list.change_status_dialog.change_status')} / ${t('report_inquiry_management_list.change_status_dialog.answer')}`
  }

  if (showChangeStatusForm.value) {
    return t('report_inquiry_management_list.change_status_dialog.change_status')
  }

  if (showAnswerForm.value) {
    return t('report_inquiry_management_list.change_status_dialog.answer')
  }

  return `${t('report_inquiry_management_list.change_status_dialog.change_status')} / ${t('report_inquiry_management_list.change_status_dialog.answer')}`
})
// #endregion submit button

provideChangeStatusAnswerContext({
  formId: id,
  activeTab,
  maxlength,
  statusOptions,
})
</script>

<template>
  <div class="max-h-[80vh] overflow-y-auto p-4">
    <!-- switch buttons -->
    <div class="flex gap-4">
      <div class="flex items-center gap-1">
        <p>{{ t('report_inquiry_management_list.change_status_dialog.change_status') }}</p>
        <Switch :model-value="showChangeStatusForm" class="text-lg" :label="{ checked: 'ON', unchecked: 'OFF' }" @update:model-value="updateShowChangeStatusForm($event)" />
      </div>
      <div class="flex items-center gap-1">
        <p>{{ t('report_inquiry_management_list.change_status_dialog.answer') }}</p>
        <Switch :model-value="showAnswerForm" class="text-lg" :label="{ checked: 'ON', unchecked: 'OFF' }" @update:model-value="updateShowAnswerForm($event)" />
      </div>
    </div>
    <Form
      ref="form"
      v-slot="form"
      v-auto-animate
      class="mt-4"
      :validation-schema="schema"
      :initial-values
      keep-values
      @submit="handleSubmit"
      @invalid-submit="onInvalidSubmit"
    >
      <!-- tabs -->
      <Tabs v-model:value="activeTab">
        <TabList class="border-b border-elevated">
          <TabIndicator />
          <Tab v-if="reportAccountTheftInquiryList.length" type="button" :value="TAB.REPORT_ACCOUNT_THEFT">
            {{ t('report_inquiry_management_list.search_form.theft') }}
          </Tab>
          <Tab v-if="reportAppealList.length" type="button" :value="TAB.APPEAL">
            {{ t('report_inquiry_management_list.search_form.appeal') }}
          </Tab>
        </TabList>
        <TabPanels keep-alive>
          <!-- tab report account theft -->
          <TabPanel v-auto-animate :value="TAB.REPORT_ACCOUNT_THEFT">
            <!-- selected inquiry list -->
            <div class="grid-table with-label rounded-sm">
              <div class="rounded-bl-4 rounded-tl-4 w-45">
                <Label required>{{ t('report_inquiry_management_list.inquiry') }}</Label>
              </div>
              <div class="rounded-br-4 rounded-tr-4">
                <InquiryList
                  class="max-h-40 overflow-auto"
                  :list="reportAccountTheftInquiryList"
                  :get-content="item => item.seqNo"
                  @remove-inquiry="selectItem($event)"
                />
              </div>
            </div>
            <!-- change status form -->
            <ChangeStatusForm v-if="showChangeStatusForm" :category="REPORT_INQUIRY_CATEGORY_OPTIONS.THEFT" />
          </TabPanel>
          <!-- tab appeal -->
          <TabPanel v-auto-animate :value="TAB.APPEAL">
            <!-- selected inquiry list -->
            <div class="grid-table with-label rounded-4">
              <div class="rounded-bl-4 rounded-tl-4 w-45">
                <Label required>{{ t('report_inquiry_management_list.inquiry') }}</Label>
              </div>
              <div class="rounded-br-4 rounded-tr-4">
                <InquiryList
                  class="max-h-40 overflow-auto"
                  :list="reportAppealList"
                  :get-content="item => item.seqNo"
                  @remove-inquiry="selectItem($event)"
                />
              </div>
            </div>
            <!-- change status form -->
            <ChangeStatusForm v-if="showChangeStatusForm" :category="REPORT_INQUIRY_CATEGORY_OPTIONS.APPEAL" />
          </TabPanel>
        </TabPanels>
      </Tabs>
      <!-- answer form -->
      <AnswerForm v-if="showAnswerForm" />
      <footer class="mt-4 flex justify-center">
        <!-- Confirm button -->
        <Button
          v-if="showChangeStatusForm || showAnswerForm"
          type="submit"
          class="btn-primary min-w-30"
          :loading="form.isSubmitting"
          :label="submitButtonLabel"
        />
      </footer>
    </Form>
  </div>
</template>
