<script lang="ts" setup>
import { difference } from 'lodash-es'
import { FormContextKey } from 'vee-validate'
import SelectLanguageDialog from '~/components/dialogs/SelectLanguageDialog.vue'
import { injectGameRegisterContext } from '../index.vue'

const formContext = inject(FormContextKey)!
const { t } = useI18n()
const { formId, maxlength, defaultLanguage, selectedLanguageLocale } = injectGameRegisterContext()
const dialogStore = useDialogStore()

const { remove, push, fields } = useFieldArray<{ locale: string, title: string, content: string }>('languages')
async function handleShowLanguageSelectDialog() {
  const formLocales = formContext.values.languages.map((i: any) => i.locale)
  const result = await dialogStore.showDialog({
    component: markRaw(SelectLanguageDialog),
    props: {
      initialSelectedValues: formLocales,
      disabledValues: [defaultLanguage.value],
    },
  })
  if (!result) return

  const removeLocales = difference(formLocales, result.selectedValues)
  removeLocales.forEach((locale) => {
    const index = fields.value.findIndex(field => field.value.locale === locale)
    remove(index)
  })

  const addLocales = difference(result.selectedValues, formLocales)
  addLocales.forEach(locale => push({
    locale,
    title: '',
    content: '',
  }))
}

function handleChangeDefaultLanguage(locale: string) {
  defaultLanguage.value = locale
}

function resetErrorsLanguageForm(skipLocale?: string) {
  for (const i in formContext.values.languages) {
    if (formContext.values.languages[i].locale === skipLocale) continue
    formContext.setFieldError(`languages[${i}].title`, '')
    formContext.setFieldError(`languages[${i}].content`, '')
  }
}

function handleSelectLanguage(newLocale: string) {
  resetErrorsLanguageForm(newLocale)
  selectedLanguageLocale.value = newLocale
}

async function handleDeleteLanguage(language: string) {
  const result = await dialogStore.showConfirm({
    description: t('messages.delete'),
  })

  if (!result) {
    return
  }

  const index = formContext.values.languages.findIndex((item: any) => item.locale === language)
  const languageAfterDelete = formContext.values.languages[index - 1]?.locale ?? formContext.values.languages[index + 1]?.locale ?? ''

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
    <div class="grid-table mt-2">
      <div class="flex w-60 items-center bg-abd p-4 font-medium">
        {{ t('game_management_register.language_inputs') }}
      </div>
      <!-- language actions -->
      <div class="flex items-center gap-4 p-4">
        <p>{{ t(`language.${selectedLanguageLocale}`) }}</p>
        <!-- default language -->
        <div class="flex items-center gap-1.5">
          <Checkbox
            :model-value="selectedLanguageLocale === defaultLanguage"
            :disabled="selectedLanguageLocale === defaultLanguage"
            @update:model-value="handleChangeDefaultLanguage(selectedLanguageLocale)"
          >
            {{ t('language.default_lang') }}
          </Checkbox>
        </div>
        <!-- delete language -->
        <button
          class="btn btn-error ml-auto"
          type="button"
          :disabled="selectedLanguageLocale === defaultLanguage"
          severity="danger"
          @click="handleDeleteLanguage(selectedLanguageLocale)"
        >
          {{ t('game_management_register.delete_language') }}
        </button>
      </div>
      <!-- languages -->
      <div class="w-60 bg-slate-50">
        <div class="space-y-4">
          <button
            v-for="field in fields"
            :key="field.key" type="button"
            class="flex w-full items-center justify-between"
            :class="[selectedLanguageLocale === field.value.locale && 'text-primary']"
            :severity="selectedLanguageLocale === field.value.locale ? 'primary' : 'secondary'"
            @click="handleSelectLanguage(field.value.locale)"
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
            {{ `${t('game_management_register.add_language')}&nbsp;&nbsp;+` }}
          </Button>
        </div>
      </div>
      <!-- inputs -->
      <div class="p-4">
        <div v-for="(field, index) in fields" :key="field.key">
          <div v-show="field.value.locale === selectedLanguageLocale">
            <!-- title label -->
            <Label
              :required="selectedLanguageLocale === defaultLanguage"
              :for="`title__${formId}`"
            >
              {{ t('game_management_register.field_title') }}
            </Label>
            <!-- title input -->
            <div class="mt-1">
              <div class="flex items-end gap-2">
                <InputWrapper v-model="formContext.values.languages[index].title" class="w-full max-w-4xl">
                  <Field
                    :id="`title__${formId}`"
                    :name="`languages[${index}].title`"
                    class="inputtext"
                    :class="[!!formContext.errors.value[`languages[${index}].title`] && 'invalid']"
                    :placeholder="t('placeholder.max_length_count', { length: maxlength.title })"
                  />
                </InputWrapper>
                <!-- characters counter -->
                <CharacterCounter
                  :value="field.value.title"
                  :max-length="50"
                />
              </div>
              <!-- error message -->
              <TransitionHeight :show="!!formContext.errors.value[`languages[${index}].title`]">
                <ErrorMessage as="p" :name="`languages[${index}].title`" class="mt-1 text-left text-error" />
              </TransitionHeight>
            </div>
            <!-- details -->
            <div class="mt-4 pr-20">
              <Label
                :for="`content__${formId}`"
                :required="selectedLanguageLocale === defaultLanguage"
              >{{ t('game_management_register.content') }}</Label>
              <!-- details input -->
              <div class="mt-1">
                <Field
                  :id="`content__${formId}`"
                  :name="`languages[${index}].content`" as="textarea"
                  class="w-full max-w-4xl rounded-md border border-slate-300 p-4"
                  :class="[!!formContext.errors.value[`languages[${index}].content`] && 'invalid']"
                />
                <TransitionHeight :show="!!formContext.errors.value[`languages[${index}].content`]">
                  <ErrorMessage as="p" :name="`languages[${index}].content`" class="mt-1 text-left text-error" />
                </TransitionHeight>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
