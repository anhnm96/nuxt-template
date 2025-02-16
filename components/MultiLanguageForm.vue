<script lang="ts" setup>
import { difference } from 'lodash-es'
import { FormContextKey } from 'vee-validate'
import { injectGameRegisterContext } from '~/pages/register.vue'
import SelectLanguageDialog from './dialogs/SelectLanguageDialog.vue'

const formContext = inject(FormContextKey)!
const id = useId()
const { t } = useI18n()
const { defaultLanguage, selectedLanguageLocale } = injectGameRegisterContext()
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
  const result = await dialogStore.showConfirmDialog({
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
      <div class="bg-slate-50 p-4 font-medium">
        {{ t('game_management_register.language_inputs') }}
      </div>
      <!-- language actions -->
      <div class="flex items-center gap-4 border-b border-slate-200 p-4">
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
          class="btn bg-error ml-auto text-white"
          type="button"
          :disabled="selectedLanguageLocale === defaultLanguage"
          severity="danger"
          @click="handleDeleteLanguage(selectedLanguageLocale)"
        >
          {{ t('game_management_register.delete_language') }}
        </button>
      </div>
      <!-- languages -->
      <div class="bg-slate-50">
        <div class="space-y-4">
          <button
            v-for="field in fields"
            :key="field.key" type="button"
            class="w-full flex items-center justify-between"
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
            {{ `${t('game_management_register.add_language')} +` }}
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
              :for="`title__${id}`"
            >
              {{ t('game_management_register.field_title') }}
            </Label>
            <!-- title input -->
            <div class="mt-1">
              <div class="flex items-end gap-2">
                <InputWrapper class="max-w-4xl w-full">
                  <Field
                    :id="`title__${id}`"
                    :name="`languages[${index}].title`"
                    class="inputtext"
                    :class="[!!formContext.errors.value[`languages[${index}].title`] && 'invalid']"
                    :placeholder="t('placeholder.max_length_count', { length: 50 })"
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
                <ErrorMessage as="p" :name="`languages[${index}].title`" class="text-error mt-1 text-left" />
              </TransitionHeight>
            </div>
            <!-- details -->
            <div class="mt-4 pr-20">
              <Label
                :for="`content__${id}`"
                :required="selectedLanguageLocale === defaultLanguage"
              >{{ t('game_management_register.content') }}</Label>
              <!-- details input -->
              <div class="mt-1">
                <Field
                  :id="`content__${id}`"
                  :name="`languages[${index}].content`" as="textarea"
                  class="max-w-4xl w-full border border-slate-300 rounded-md p-4"
                  :class="[!!formContext.errors.value[`languages[${index}].content`] && 'invalid']"
                />
                <TransitionHeight :show="!!formContext.errors.value[`languages[${index}].content`]">
                  <ErrorMessage as="p" :name="`languages[${index}].content`" class="text-error mt-1 text-left" />
                </TransitionHeight>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
