<script lang="ts">
import type { ShallowRef } from 'vue'
import { Form } from '#components'
import * as v from 'valibot'
import SelectCountryDialog from '~/components/dialogs/SelectCountryDialog.vue'
import MultiLanguageForm from '~/components/MultiLanguageForm.vue'

interface LanguageItem {
  locale: string
  title: string
  content: string
  defaultLanguage: boolean
}

interface GameRegisterContext {
  formRef: Readonly<ShallowRef<InstanceType<typeof Form>>>
  isFormSubmitted: Ref<boolean>
  selectedLanguageLocale: Ref<string>
  defaultLanguage: Ref<string>
}

export const [provideGameRegisterContext, injectGameRegisterContext]
= createContext<GameRegisterContext>('GameRegister')
</script>

<script lang="ts" setup>
const id = useId()
const formRef = useTemplateRef('form')
const isFormSubmitted = ref(false)
const initialValues = {
  name: '',
  url: '',
  countries: [],
  languages: [
    { locale: 'en', title: '', content: '' },
  ],
}
const defaultLanguage = ref('en')
const selectedLanguageLocale = ref('en')
provideGameRegisterContext({
  formRef: formRef as any,
  isFormSubmitted,
  defaultLanguage,
  selectedLanguageLocale,
})

function handleSubmit(values: any) {
  console.info('values', values)
  isFormSubmitted.value = true

  const defaultLanguageInfoItem = formRef.value!.values.languages.find((item: LanguageItem) => item.locale === defaultLanguage.value)!
  const languagesPayload: LanguageItem[] = []
  for (const languageItem of formRef.value!.values.languages) {
    if (!languageItem.title && !languageItem.content) {
      languagesPayload.push({
        locale: languageItem.locale,
        title: defaultLanguageInfoItem.title,
        content: defaultLanguageInfoItem.content,
        defaultLanguage: languageItem.locale === defaultLanguage.value,
      })
    } else {
      languagesPayload.push({ ...languageItem, default: languageItem.locale === defaultLanguage.value })
    }
  }
}

function onInvalidSubmit({ errors, results, values }: any) {
  // focus first invalid basic field
  const basicFieldNamesOrder = ['name', 'url', 'image']
  const invalidFieldNames = Object.keys(errors)
  let hasInvalidBasicField = false
  const firstInvalidFieldName = basicFieldNamesOrder.find(field => invalidFieldNames.includes(field))
  if (firstInvalidFieldName) {
    focusField(firstInvalidFieldName)
    hasInvalidBasicField = true
  }

  // select invalid language tab and focus first invalid language field
  const languageFieldNamesOrder = ['title', 'content']
  for (let i = 0; i < values.languages.length; i++) {
    for (const fieldName of languageFieldNamesOrder) {
      if (results[`languages[${i}].${fieldName}`]?.valid === false) {
        selectedLanguageLocale.value = values.languages[i].locale
        if (!hasInvalidBasicField)
          nextTick(() => focusField(`languages[${i}].${fieldName}`))
        return
      }
    }
  }
}

const { t } = useI18n()
const schema = toTypedSchema(
  v.object({
    name: v.pipe(v.string(), v.nonEmpty(t('error.required'))),
    url: v.optional(
      v.union([
        v.pipe(
          v.string(),
          v.maxLength(255),
          v.url(t('game_management_register.error_messages.invalid_url')),
        ),
        v.literal(''),
      ]),
    ),
    image: v.pipe(
      v.file('File is required'),
      v.maxSize(1000000, `Please select a file smaller than ${1} MB.`),
    ),
    countries: v.pipe(v.array(v.string()), v.minLength(1)),
    languages: v.array(v.pipe(
      v.object({
        locale: v.string(),
        title: v.string(),
        content: v.string(),
      }),
      v.forward(
        v.check(
          (input) => {
            // required if default language
            if (input.locale === defaultLanguage.value) {
              return input.title.length > 0
            }

            // required if details is not empty
            if (input.content.length > 0) {
              return input.title.length > 0
            }

            return true
          },
          t('error.required'),
        ),
        ['title'],
      ),
      v.forward(
        v.check(
          (input) => {
            // required if default language
            if (input.locale === defaultLanguage.value) {
              return input.content.length > 0
            }

            // required if details is not empty
            if (input.title.length > 0) {
              return input.content.length > 0
            }

            return true
          },
          t('error.required'),
        ),
        ['content'],
      ),
    )),
  }),
)

function focusField(fieldName: string) {
  const el = (formRef.value!.$el as HTMLElement).querySelector<HTMLElement>(`[name="${fieldName}"]`)
  if (!el) return
  el.focus()
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function handleSelectImage(file: FileList) {
  const img = document.getElementById(`images__${id}`) as HTMLImageElement
  const reader = new FileReader()
  reader.onloadend = function () {
    img.src = reader.result as string
  }
  reader.readAsDataURL(file[0])
}

function handleInputCode(event: Event) {
  formRef.value!.setFieldValue('name', filterInputValue(event, (value: string) => filterNumberUpperAlphaUnderscoreOnly(value.toUpperCase())))
}

const dialogStore = useDialogStore()
async function showSelectCountryDialog() {
  const result = await dialogStore.showDialog({ component: markRaw(SelectCountryDialog) })
  if (!result) return
  formRef.value!.setFieldValue('countries', result)
}
</script>

<template>
  <div class="mx-auto max-w-7xl p-4">
    register
    <Form
      ref="form"
      v-slot="{ values, errors, submitCount, setFieldError, setFieldValue }"
      :validation-schema="schema"
      :initial-values
      keep-values
      @submit="handleSubmit"
      @invalid-submit="onInvalidSubmit"
    >
      <div class="grid-table with-label">
        <!-- name -->
        <Label :for="`name__${id}`" required>Name</Label>
        <div>
          <div class="flex items-end gap-2">
            <InputWrapper class="max-w-4xl w-full">
              <Field
                :id="`name__${id}`"
                class="inputtext"
                :class="[errors.name && 'invalid']"
                name="name" placeholder="name" autocomplete="new-password"
                @input="handleInputCode($event);setFieldError('name', '')"
              />
            </InputWrapper>
            <CharacterCounter :value="values.name" :max-length="15" />
          </div>
          <TransitionHeight :show="!!errors.name">
            <ErrorMessage as="p" name="name" class="text-error mt-1 max-w-4xl text-left" />
          </TransitionHeight>
        </div>
        <!-- url -->
        <Label :for="`url__${id}`">URL</Label>
        <div>
          <div class="flex items-end gap-2">
            <InputWrapper class="max-w-4xl w-full">
              <Field
                :id="`url__${id}`"
                class="inputtext"
                :class="[errors.url && 'invalid']"
                name="url" placeholder="URL" autocomplete="new-password"
                @input="setFieldError('url', '')"
              />
            </InputWrapper>
            <CharacterCounter :value="values.url" :max-length="255" />
          </div>
          <TransitionHeight :show="!!errors.url">
            <ErrorMessage as="p" name="url" class="text-error mt-1 text-left" />
          </TransitionHeight>
        </div>
        <!-- image -->
        <Label required>
          Image
        </Label>
        <div>
          <div class="flex gap-4">
            <div class="relative grid h-24 w-40 place-items-center overflow-hidden border border-slate-200 rounded bg-slate-50 text-gray-400">
              <Icon v-show="!values.image" name="bx:image-add" size="48" />
              <!-- image preview -->
              <div v-show="values.image" class="absolute inset-0">
                <img :id="`images__${id}`" class="h-full w-full object-cover">
              </div>
            </div>
            <div class="flex flex-col">
              <ul class="list-bullet text-xs text-slate-400">
                <li>상품 이미지는 최대 1개까지 첨부 가능합니다.</li>
                <li>권장 사이즈 : 800x600 / 최대 100 KB</li>
              </ul>
              <Field v-if="!values.image" v-slot="{ handleChange }" name="image">
                <FileUpload
                  :id="`image-${id}`"
                  :pt="{ input: { onChange: handleChange } }"
                  class="mt-auto self-baseline"
                  :accepted-file-types="['image/*']"
                  @change="handleSelectImage"
                />
              </Field>
              <button v-else class="btn bg-error mt-auto self-baseline text-white" @click="setFieldValue('image', null)">
                Clear Image
              </button>
            </div>
          </div>
          <p class="mt-1 text-xs text-slate-400">
            - {{ t('game_management_register.image_description') }}
          </p>
          <TransitionHeight :show="!!errors.image">
            <ErrorMessage as="p" name="image" class="text-error mt-1 text-left" />
          </TransitionHeight>
        </div>
        <!-- countries -->
        <Label>
          Country
        </Label>
        <div>
          <button
            type="button" class="btn btn-primary"
            @click="showSelectCountryDialog"
          >
            {{ $t('select_country') }}
          </button>
          <Badge
            severity="primary"
            class="ml-4"
            :class="{ 'bg-slate-400': !values.countries.length }"
            :value="values.countries.length"
          />
          <TransitionHeight :show="submitCount > 0 && !!errors.countries">
            <ErrorMessage as="p" name="countries" class="text-error mt-1 text-left" />
          </TransitionHeight>
        </div>
      </div>
      <!-- language form -->
      <MultiLanguageForm class="mt-4" :values :errors />
      <!-- actions -->
      <div class="mt-4 flex justify-between gap-4">
        <NuxtLink to="/list" class="btn btn-outline min-w-btn">
          List
        </NuxtLink>
        <button type="submit" class="btn min-w-btn btn-primary gap-1">
          <span>Submit</span>
          <Icon name="tabler:check" size="14" />
        </button>
      </div>
    </Form>
  </div>
</template>

<style>
@reference "../assets/css/main.css";
.grid-table {
  @apply grid grid-cols-[220px_1fr] border-slate-200 border-t border-l;

  & > * {
    @apply border-slate-200 border-r border-b p-4;
  }

  &.with-label > *:nth-child(odd) {
      @apply bg-slate-50 flex items-center;
  }
}

.list-bullet>li {
  @apply before:content-["•"] before:mr-1.5;

}

.list-bullet--horizontal {
  @apply flex items-end h-full;

  >li {
    @apply before:content-["|"] before:mx-1.5;
  }

  >li:first-of-type {
    @apply before:content-none;
  }
}
</style>
