<script setup lang="ts">
import type { InquiryAnswerTemplate, InquiryAnswerTemplateLanguage, InquiryTemplateList } from '../types'
import { FormContextKey } from 'vee-validate'
import Button from '~/components/Button.vue'
import { getInquiryTemplateAnswer } from '~/services/inquiries'
import { injectProductsRootContext } from '../index.vue'
import { injectChangeStatusAnswerContext } from './ChangeStatusAnswerDialog.vue'

const formContext = inject(FormContextKey)!
const { t } = useI18n()

const { appliedSearchForm } = injectProductsRootContext()

const {
  formId,
  maxlength,
  activeTab,
} = injectChangeStatusAnswerContext()

const templateListOptions = shallowRef<InquiryAnswerTemplate[]>([])
const recentUsedTemplateList = shallowRef<InquiryAnswerTemplate[]>([])
const selectedTemplateId = shallowRef<number>()
const selectedTemplate = shallowRef<InquiryAnswerTemplate>()
const selectedLanguageCode = shallowRef<string>()
const languageListOptions = shallowRef<InquiryAnswerTemplateLanguage[]>([])

const selectedTemplateLabel = computed(() => {
  const template = templateListOptions.value.find(item => item.seqNo === selectedTemplateId.value)

  return template ? template.templateName : '-'
})

function handleSelectTemplate(seqNo: number) {
  selectedTemplateId.value = seqNo
  const template = templateListOptions.value.find(item => item.seqNo === seqNo)

  if (!template) return

  selectedTemplate.value = template
  // init language options
  languageListOptions.value = template.languages
  // set default selected language
  selectedLanguageCode.value = languageListOptions.value[0]?.languageCode
}

function handleApplyTemplate() {
  const templateLanguage = selectedTemplate.value!.languages.find(item => item.languageCode === selectedLanguageCode.value)
  let newContent = formContext.values[activeTab.value].bulkAnswerRequest.answerContent + (templateLanguage?.content || '')

  if (getHTMLTextContentLength(newContent) > maxlength.bulkAnswerRequest.answerContent) {
    newContent = truncateHtmlTextContent(newContent, maxlength.bulkAnswerRequest.answerContent)
  }

  formContext.setValues({
    [activeTab.value]: {
      bulkAnswerRequest: {
        answerTemplateSeqNo: selectedTemplateId.value,
        templateLanguageCode: selectedLanguageCode.value,
        answerTitle: templateLanguage?.title || '',
        answerContent: newContent,
      },
    },
  })
}

function handleApplyRencetUsedTemplate(seqNo: number) {
  handleSelectTemplate(seqNo)
  handleApplyTemplate()
}

function initTemplate(data: InquiryTemplateList) {
  recentUsedTemplateList.value = data.lastSelected ?? []
  templateListOptions.value = data.selectBox.content ?? []
  handleSelectTemplate(templateListOptions.value[0]!.seqNo)
}

const { isLoading: isLoadingTemplateAnswer } = useQuery({
  key: () => ['inquiry', { service: appliedSearchForm.value!.serviceId! }, 'template-answer'],
  query: () => getInquiryTemplateAnswer(appliedSearchForm.value!.serviceId!).then((data) => {
    initTemplate(data)

    return data
  }),
})
// init template in case of cache available
const cache = useQueryCache()
const data = cache.getQueryData<InquiryTemplateList>(['inquiry', { service: appliedSearchForm.value!.serviceId! }, 'template-answer'])
if (data) {
  initTemplate(data)
}
</script>

<template>
  <h2 class="mt-4 font-medium">
    {{ t('report_inquiry_management_list.change_status_dialog.answer') }}
  </h2>
  <div class="grid-table with-label mt-2 rounded-md">
    <!-- answer template -->
    <div class="w-45">
      <Label :for="`template__${formId}`">
        {{ t('report_inquiry_management_list.change_status_dialog.answer_templates') }}
      </Label>
    </div>
    <div>
      <!-- template list and languages -->
      <div class="flex gap-4">
        <!-- template list -->
        <Select
          :model-value="selectedTemplateId"
          class="contain-inline-size flex-grow"
          :label-id="`template__${formId}`"
          option-label="templateName"
          option-value="seqNo"
          :placeholder="t('game_dialog.placeholder_select')"
          :reset-filter-on-hide="false"
          :options="templateListOptions"
          :scroll-height="templateListOptions.length > 6 ? '18.5rem' : '19rem'"
          :filter="templateListOptions.length > 6"
          :empty-filter-message="t('messages.no_search_result')"
          :pt="{ label: { title: selectedTemplateLabel } }"
          :loading="isLoadingTemplateAnswer"
          @update:model-value="handleSelectTemplate"
        >
          <template #option="{ option }">
            <p :title="option.templateName" class="max-w-125 truncate">
              {{ option.templateName }}
            </p>
          </template>
        </Select>
        <!-- language list -->
        <Select
          v-model="selectedLanguageCode"
          class="w-50"
          :label-id="`language__${formId}`"
          option-label="languageName"
          option-value="languageCode"
          :placeholder="t('game_dialog.placeholder_select')"
          :reset-filter-on-hide="false"
          :options="languageListOptions"
          :scroll-height="languageListOptions.length > 6 ? '18.5rem' : '19rem'"
          :filter="languageListOptions.length > 6"
          :loading="isLoadingTemplateAnswer"
        />
        <!-- add button -->
        <Button
          type="button"
          class="btn-primary"
          :label="t('add')"
          :icon="{ name: 'i-ph:plus' }"
          :disabled="!selectedTemplateId && !selectedLanguageCode"
          @click="handleApplyTemplate"
        />
      </div>
      <!-- recently used template title -->
      <div class="mt-4 flex gap-1">
        <h3 class="font-medium">
          {{ t('report_inquiry_management_list.change_status_dialog.recently_used') }}
        </h3>
        <div class="inline-flex items-center">
          <Icon class="text-primary" name="mingcute:question-fill" />
          <Tooltip class="tooltip-dark">
            {{ t('report_inquiry_management_list.change_status_dialog.recently_used_tooltip') }}
          </Tooltip>
        </div>
      </div>
      <!-- recently used template list -->
      <div class="contain-inline-size mt-2 flex flex-wrap gap-4">
        <div
          v-for="item in recentUsedTemplateList"
          :key="item.seqNo"
          class="h-9 max-w-full flex cursor-pointer items-center rounded-md bg-abd px-4"
          :title="item.templateName"
          @click="handleApplyRencetUsedTemplate(item.seqNo)"
        >
          <p class="flex-grow truncate">
            {{ item.templateName }}
          </p>
        </div>
      </div>
    </div>
    <!-- title -->
    <div>
      <Label :for="`answerTitle__${formId}`" required>
        {{ t('report_inquiry_management_list.search_form.title') }}
      </Label>
    </div>
    <div class="pr-8">
      <div class="flex flex-grow items-end gap-2">
        <InputWrapper class="w-full" :model-value="formContext.values[activeTab].bulkAnswerRequest.answerTitle">
          <Field
            :id="`answerTitle__${formId}`"
            :name="`${activeTab}.bulkAnswerRequest.answerTitle`"
            class="inputtext"
            :class="[formContext.submitCount.value > 0 && !!formContext.errors.value[`${activeTab}.bulkAnswerRequest.answerTitle`] && 'invalid']"
            :placeholder="t('placeholder.max_length_count', { length: maxlength.bulkAnswerRequest.answerTitle })"
          />
        </InputWrapper>
        <!-- characters counter -->
        <CharacterCounter :value="formContext.values[activeTab].bulkAnswerRequest.answerTitle" :max-length="maxlength.bulkAnswerRequest.answerTitle" />
      </div>
      <!-- error message -->
      <TransitionHeight :show="formContext.submitCount.value > 0 && !!formContext.errors.value[`${activeTab}.bulkAnswerRequest.answerTitle`]">
        <ErrorMessage as="p" :name="`${activeTab}.bulkAnswerRequest.answerTitle`" class="text-error mt-1 text-left" />
      </TransitionHeight>
    </div>
    <!-- content -->
    <div>
      <Label required :for="`answerContent__${formId}`">
        {{ t('report_inquiry_management_register.content') }}
      </Label>
    </div>
    <div class="contain-inline-size pr-25">
      <div class="relative">
        <Field
          :id="`answerContent__${formId}`"
          :name="`${activeTab}.bulkAnswerRequest.answerContent`" as="textarea"
          class="max-w-4xl textarea pr-7"
          :class="[formContext.submitCount.value > 0 && !!formContext.errors.value[`${activeTab}.bulkAnswerRequest.answerContent`] && 'invalid']"
        />
        <button
          v-if="formContext.values[activeTab].bulkAnswerRequest.answerContent.length > 0"
          class="absolute right-0 top-0 bottom-0 p-0 pr-2 inline-flex items-center"
          @click="formContext.values[activeTab].bulkAnswerRequest.answerContent = ''"
        >
          <Icon name="ph:x-circle" size="18" />
        </button>
      </div>
      <!-- error message -->
      <TransitionHeight :show="formContext.submitCount.value > 0 && !!formContext.errors.value[`${activeTab}.bulkAnswerRequest.answerContent`]">
        <ErrorMessage as="p" :name="`${activeTab}.bulkAnswerRequest.answerContent`" class="text-error mt-1 text-left" />
      </TransitionHeight>
    </div>
  </div>
</template>
