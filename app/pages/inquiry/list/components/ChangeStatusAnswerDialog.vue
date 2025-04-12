<script lang="ts">
import type { ChangeStatusAnswerFormValue, InquiryAnswerTemplate, InquiryAnswerTemplateLanguage, ReportStatus, UpdateInquiryRequestBody } from '../types'
import { cloneDeep } from 'lodash-es'
import * as v from 'valibot'
import Button from '~/components/Button.vue'
import DialogPanel from '~/components/dialog/DialogPanel.vue'
import Tab from '~/components/tab/Tab.vue'
import TabList from '~/components/tab/TabList.vue'
import TabPanel from '~/components/tab/TabPanel.vue'
import TabPanels from '~/components/tab/TabPanels.vue'
import Tabs from '~/components/tab/Tabs.vue'
import { getInquiryTemplateAnswer, updateStatusBulk } from '~/services/inquiries'
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
  formValue: Ref<ChangeStatusAnswerFormValue>
  maxlength: {
    memo: number
    answerTitle: number
    answerContent: number
  }
  statusOptions: ComputedRef<ReportStatus[]>
  selectedTemplateId: Ref<number | undefined>
  recentUsedTemplateList: Ref<InquiryAnswerTemplate[]>
  templateListOptions: Ref<InquiryAnswerTemplate[]>
  handleSelectTemplate: (seqNo: number) => void
  selectedLanguageCode: Ref<string | undefined>
  languageListOptions: Ref<InquiryAnswerTemplateLanguage[]>
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
  answerTitle: 100,
  answerContent: 10000,
}

const dialogStore = useDialogStore()
const showChangeStatusForm = ref(true)
const showAnswerForm = ref(true)

const {
  selectedItems,
  appliedSearchForm,
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

const initialValues = {
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
const formValue = ref(initialValues)
const tabSchema = v.object({
  reportSeqNos: v.pipe(v.array(v.number()), v.minLength(1)),
  status: v.optional(v.string()),
  detailStatus: v.optional(v.string()),
  memo: v.optional(v.pipe(v.string(), v.maxLength(maxlength.memo))),
  bulkAnswerRequest: v.optional(v.object({
    answerTemplateSeqNo: v.optional(v.number()),
    templateLanguageCode: v.optional(v.string()),
    answerTitle: v.pipe(v.string(), v.nonEmpty(), v.maxLength(maxlength.answerTitle)),
    answerContent: v.pipe(v.string(), v.nonEmpty(), v.maxLength(maxlength.answerContent)),
  })),
})

const schema = toTypedSchema(v.object({
  bulkUpdateReportStatus: v.optional(tabSchema),
  bulkUpdateObjectionStatus: v.optional(tabSchema),
}))

// #region answer template
const templateListOptions = ref<InquiryAnswerTemplate[]>([])
const recentUsedTemplateList = ref<InquiryAnswerTemplate[]>([])
const selectedTemplateId = ref<number>()
const selectedTemplate = ref<InquiryAnswerTemplate>()
const selectedLanguageCode = ref<string>()
const languageListOptions = ref<InquiryAnswerTemplateLanguage[]>([])

function handleSelectTemplate(seqNo: number) {
  selectedTemplateId.value = seqNo
  const template = templateListOptions.value.find(item => item.seqNo === seqNo)

  selectedTemplate.value = template

  if (!template) {
    return
  }

  // init language options
  languageListOptions.value = template.languages
  // set default selected language
  selectedLanguageCode.value = languageListOptions.value[0]?.languageCode
}
// #endregion

// truncate text fields if exceed max length
function truncateFields() {
  for (const formName of availableForms.value) {
    const form = formValue.value[formName]!

    if (form.memo.length > maxlength.memo) {
      form.memo = form.memo.slice(0, maxlength.memo)
    }

    if (form.bulkAnswerRequest.answerTitle.length > maxlength.answerTitle) {
      form.bulkAnswerRequest.answerTitle = form.bulkAnswerRequest.answerTitle.slice(0, maxlength.answerTitle)
    }

    // if (getHTMLTextContentLength(form.bulkAnswerRequest.answerContent) > maxlength.answerContent) {
    //   form.bulkAnswerRequest.answerContent = truncateHtmlTextContent(form.bulkAnswerRequest.answerContent, maxlength.answerContent)
    // }
  }
}

const formRef = useTemplateRef('form')
function focusField(fieldName: string) {
  const el = (formRef.value!.$el as HTMLElement).querySelector<HTMLElement>(`[name="${fieldName}"]`)
  if (!el) return
  el.focus()
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function onInvalidSubmit({ errors, results, values }: any) {
  // focus first invalid basic field
  const basicFieldNamesOrder = ['answerTitle', 'answerContent']
  const invalidFieldNames = Object.keys(errors)
  let hasInvalidBasicField = false
  const firstInvalidFieldName = basicFieldNamesOrder.find(field => invalidFieldNames.includes(field))
  if (firstInvalidFieldName) {
    focusField(firstInvalidFieldName)
    hasInvalidBasicField = true
  }

  // select invalid language tab and focus first invalid language field
  // const languageFieldNamesOrder = ['title', 'content']
  // for (let i = 0; i < values.languages.length; i++) {
  //   for (const fieldName of languageFieldNamesOrder) {
  //     if (results[`languages[${i}].${fieldName}`]?.valid === false) {
  //       selectedLanguageLocale.value = values.languages[i].locale
  //       if (!hasInvalidBasicField)
  //         nextTick(() => focusField(`languages[${i}].${fieldName}`))
  //       return
  //     }
  //   }
  // }
}

async function handleSubmit(values: any) {
  console.log('values', values)
  const payload: UpdateInquiryRequestBody = cloneDeep(formValue.value)

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

    if (!result) {
      return
    }
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

async function init() {
  const data = await getInquiryTemplateAnswer(appliedSearchForm.value!.serviceId!)

  recentUsedTemplateList.value = data.lastSelected ?? []
  templateListOptions.value = data.selectBox.content ?? []
  handleSelectTemplate(templateListOptions.value[0]!.seqNo)
}
init()

provideChangeStatusAnswerContext({
  formId: id,
  activeTab,
  formValue,
  maxlength,
  statusOptions,
  selectedTemplateId,
  recentUsedTemplateList,
  templateListOptions,
  handleSelectTemplate,
  selectedLanguageCode,
  languageListOptions,
})
</script>

<template>
  <div class="h-full flex items-end justify-center px-4 sm:items-center sm:p-0">
    <DialogPanel class="relative w-250 inline-block overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle">
      <div class="flex items-center justify-between bg-primary px-6 py-1.5 text-white">
        <h3 class="text-lg font-medium">
          {{ `${t('report_inquiry_management_list.change_status_dialog.change_status')} / ${t('report_inquiry_management_list.change_status_dialog.answer')}` }}
        </h3>
        <div class="float-end -mr-2.5">
          <button
            type="button"
            class="rounded-full btn btn-icon text-white hover:bg-white/20"
            @click="$emit('close')"
          >
            <span class="sr-only">Close</span>
            <Icon class="text-xl" name="ph:x-bold" />
          </button>
        </div>
      </div>
      <!-- switch buttons -->
      <!-- <div class="flex gap-4">
        <div class="flex items-center gap-1">
          <p>{{ t('report_inquiry_management_list.change_status_dialog.change_status') }}</p>
          <ToggleButton
            v-model="showChangeStatusForm"
            checked-label="ON"
            un-checked-label="OFF"
            class="text-lg"
          />
        </div>
        <div class="flex items-center gap-1">
          <p>{{ t('report_inquiry_management_list.change_status_dialog.answer') }}</p>
          <ToggleButton
            v-model="showAnswerForm"
            checked-label="ON"
            un-checked-label="OFF"
            class="text-lg"
          />
        </div>
      </div> -->
      <Form
        ref="form"
        v-slot="form"
        class="p-4 overflow-y-auto max-h-[80vh]"
        :validation-schema="schema"
        :initial-values
        keep-values
        @submit="handleSubmit"
        @invalid-submit="onInvalidSubmit"
      >
        <!-- tabs -->
        <Tabs
          v-slot="{ activeItem }"
          v-model:value="activeTab"
        >
          <TabList class="border-b border-abd">
            <div
              :style="{
                width: `${activeItem.size}px`,
                transform: `translateX(${activeItem.position}px)`,
              }"
              class="absolute bottom-0 left-0 h-0.5 rounded-full bg-primary transition-[width,transform] duration-300"
            />
            <Tab v-if="reportAccountTheftInquiryList.length" type="button" :value="TAB.REPORT_ACCOUNT_THEFT">
              {{ t('report_inquiry_management_list.search_form.theft') }}
            </Tab>
            <Tab v-if="reportAppealList.length" type="button" :value="TAB.APPEAL">
              {{ t('report_inquiry_management_list.search_form.appeal') }}
            </Tab>
          </TabList>
          <TabPanels>
            <!-- tab report account theft -->
            <TabPanel :value="TAB.REPORT_ACCOUNT_THEFT">
              <!-- selected inquiry list -->
              <div class="grid-table with-label rounded-sm">
                <div class="w-45 rounded-bl-4 rounded-tl-4">
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
            <TabPanel :value="TAB.APPEAL">
              <!-- selected inquiry list -->
              <div class="grid-table with-label rounded-4">
                <div class="w-45 rounded-bl-4 rounded-tl-4">
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
        <footer class="flex justify-center mt-4">
          <!-- Confirm button -->
          <Button
            v-if="showChangeStatusForm || showAnswerForm"
            class="min-w-30 btn-primary"
            :loading="form.isSubmitting"
            :label="submitButtonLabel"
            @click="handleSubmit"
          />
        </footer>
      </Form>
    </DialogPanel>
  </div>
</template>
