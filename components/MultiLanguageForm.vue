<script lang="ts" setup>
// import { injectGameRegisterContext } from '~/pages/register.vue'
import SelectLanguageDialog from './dialogs/SelectLanguageDialog.vue'

const { values } = defineProps<{
  values: any
  errors: any
}>()
const id = useId()
const { t } = useI18n()
// const { formRef } = injectGameRegisterContext()

const dialogStore = useDialogStore()
const { remove, push, fields } = useFieldArray<{ locale: string, title: string, content: string }>('languages')
async function handleShowLanguageSelectDialog() {
  const result = await dialogStore.showDialog({ component: markRaw(SelectLanguageDialog) })
  if (!result) return

  result.newlySelectedValues.forEach(locale => push({
    locale,
    title: '',
    content: '',
  }))
}
const selectedLanguage = ref('en')
const defaultLanguage = ref('en')
const selectedInfoItem = computed(() => values.languages.find((i: any) => i.locale === selectedLanguage.value))
function handleChangeDefaultLanguage(locale: string) {
  defaultLanguage.value = locale
}
function handleSelectLanguage(locale: string) {
  selectedLanguage.value = locale
}
async function handleDeleteLanguage(language: string) {
  const result = await dialogStore.showConfirmDialog({
    description: t('messages.delete'),
  })

  if (!result) {
    return
  }

  const index = values.languages.findIndex((item: any) => item.locale === language)
  const languageAfterDelete = values.languages[index - 1]?.locale ?? values.languages[index + 1]?.locale ?? ''

  if (index !== -1) {
    remove(index)
  }

  handleSelectLanguage(languageAfterDelete)
}
</script>

<template>
  <div>
    <h2 class="text-lg font-medium">
      {{ t('game_management_register.language_form') }}
    </h2>
    <div class="grid-table mt-1">
      <div class="min-w-[220px] bg-slate-50 px-4 py-6">
        {{ t('game_management_register.language_inputs') }}
      </div>
      <!-- language actions -->
      <div class="flex items-center gap-4 border-b border-slate-200 p-4">
        <p>{{ t(`language.${selectedLanguage}`) }}</p>
        <!-- default language -->
        <div class="flex items-center gap-1.5">
          <Checkbox
            :model-value="selectedLanguage === defaultLanguage"
            :disabled="selectedLanguage === defaultLanguage"
            @update:model-value="handleChangeDefaultLanguage(selectedLanguage)"
          >
            {{ t('language.default_lang') }}
          </Checkbox>
        </div>
        <!-- delete language -->
        <button
          class="btn bg-error ml-auto text-white"
          type="button"
          :disabled="selectedLanguage === defaultLanguage"
          severity="danger"
          @click="handleDeleteLanguage(selectedLanguage)"
        >
          {{ t('game_management_register.delete_language') }}
        </button>
      </div>
      <!-- languages -->
      <div class="bg-slate-50">
        <div class="space-y-4">
          <button
            v-for="field in fields" :key="field.key"
            class="btn-link w-full flex items-center justify-between"
            :severity="selectedLanguage === field.value.locale ? 'primary' : 'secondary'"
            @click="selectedLanguage = field.value.locale"
          >
            <span class="text-left">
              {{ t(`language.${field.value.locale}`) }}
              <span v-if="field.value.locale === defaultLanguage" class="inline-block">{{
                t('language.default')
              }}</span>
            </span>
            <Icon name="lucide:chevron-right" />
          </button>
        </div>
        <div class="py-4 text-center">
          <!-- add language -->
          <Button class="btn-primary" type="button" @click="handleShowLanguageSelectDialog">
            {{ `${t('game_management_register.add_language')} +` }}
          </Button>
        </div>
      </div>
      <!-- inputs -->
      <div class="p-4">
        <div v-for="(field, index) in fields" :key="field.key">
          <template v-if="field.value.locale === selectedLanguage">
            <!-- title label -->
            <label
              :required="selectedInfoItem.locale === defaultLanguage"
              :forAttr="`title__${id}`"
            >
              {{ t('game_management_register.field_title') }}
            </label>
            <!-- title input -->
            <div class="mt-1">
              <div class="flex items-end gap-2">
                <InputWrapper class="max-w-4xl w-full">
                  <Field
                    :id="`title__${id}`" :name="`languages[${index}].title`"
                    class="inputtext" :placeholder="t('placeholder.max_length_count', { length: 50 })"
                  />
                </InputWrapper>
                <!-- characters counter -->
                <CharacterCounter
                  :value="selectedInfoItem.title"
                  :max-length="50"
                />
              </div>
              <!-- error message -->
              <TransitionHeight :show="!!errors[`languages[${index}].title`]">
                <ErrorMessage as="p" :name="`languages[${index}].title`" class="text-error mt-1 text-left" />
              </TransitionHeight>
            </div>
            <!-- details -->
            <div class="mt-4 pr-20">
              <label :required="selectedInfoItem.locale === defaultLanguage">{{ t('game_management_register.content') }}</label>
              <!-- details input -->
              <div class="mt-1">
                <Field :name="`languages[${index}].content`" as="textarea" class="max-w-4xl w-full border border-slate-300 rounded-md p-4" />
                <TransitionHeight :show="!!errors[`languages[${index}].content`]">
                  <ErrorMessage as="p" :name="`languages[${index}].content`" class="text-error mt-1 text-left" />
                </TransitionHeight>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
