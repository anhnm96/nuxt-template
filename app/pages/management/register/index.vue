<script lang="ts">
import * as v from 'valibot'
import { PAGE_MANAGEMENT_LIST } from '../list/index.vue'
import BasicForm from './components/BasicForm.vue'
import MultiLanguageForm from './components/MultiLanguageForm.vue'

export const PAGE_MANAGEMENT_REGISTER = 'PAGE_MANAGEMENT_REGISTER'

interface LanguageItem {
  locale: string
  title: string
  content: string
  defaultLanguage: boolean
}

interface GameRegisterContext {
  formId: string
  selectedLanguageLocale: Ref<string>
  defaultLanguage: Ref<string>
  maxlength: {
    name: number
    url: number
    title: number
  }
  isEditMode: boolean
}

export const [provideGameRegisterContext, injectGameRegisterContext]
= createContext<GameRegisterContext>('GameRegister')
</script>

<script lang="ts" setup>
// TODO: date range picker, show alert, bookmark, breadcrumb
definePageMeta({
  name: PAGE_MANAGEMENT_REGISTER,
})

const route = useRoute()
const { t } = useI18n()
const formId = useId()
const itemId = route.query.id as string
const isEditMode = !!itemId

const formRef = useTemplateRef('form')
const initialValues = {
  category: '',
  name: '',
  url: '',
  countries: ['CA', 'GL', 'TW', 'AF'],
  languages: [
    { locale: 'en', title: '', content: '' },
  ],
}
const maxlength = {
  name: 50,
  url: 255,
  title: 50,
}

const defaultLanguage = ref('en')
const selectedLanguageLocale = ref('en')
provideGameRegisterContext({
  formId,
  defaultLanguage,
  selectedLanguageLocale,
  maxlength,
  isEditMode,
})

function handleSubmit(values: any) {
  console.info('values', values)

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

  // const payload = {
  //     ...cloneDeep(form.value),
  //     ...topFixedPayload,
  //     topFixedStartedAt: form.value.topFixedStartedAt?.toISOString(),
  //     topFixedEndedAt: form.value.topFixedEndedAt?.toISOString(),
  //     topFixedIndefinite: form.value.topFixedEndedAt?.getFullYear() === 9999,
  //     reportFaqLanguageInfos: infoPayload,
  //   } as HelpRegisterFormValue;

  //   const { data } = isEditMode.value
  //     ? await updateReportHelp(reportFaqNo, payload, { shouldUseDefaultErrorHandler: false })
  //     : await createReportHelp(payload, { shouldUseDefaultErrorHandler: true });

  //   // show error message
  //   if (data?.status !== 0) {
  //     await showAlert({
  //       content: [t('messages.save_fail')],
  //       severity: 'danger',
  //     });

  //     return;
  //   }

  //   // show success message
  //   await showAlert({
  //     content: [isEditMode.value ? t('messages.update_ok') : t('messages.create_ok2')],
  //     severity: 'success',
  //   });
  navigateTo({ name: PAGE_MANAGEMENT_LIST, query: route.query })
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

const schema = toTypedSchema(
  v.object({
    category: v.pipe(v.string(), v.nonEmpty()),
    name: v.pipe(v.string(), v.nonEmpty()),
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
    image: v.pipe(v.string(), v.nonEmpty()),
    // v.pipe(
    //   v.file(),
    //   v.maxSize(1000000, `Please select a file smaller than ${1} MB.`),
    // ),
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

const { data: product, refetch } = useQuery({
  key: () => ['products', itemId],
  query: () => $fetch<Product>(`https://dummyjson.com/products/${itemId}`),
  enabled: false,
})

async function init() {
  if (isEditMode) {
    await refetch()
    if (!product.value) return

    formRef.value?.resetForm({
      values: {
        category: product.value.category,
        name: product.value.title,
        image: product.value.thumbnail,
      },
    })
  }
}

init()
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 py-8">
    <Form
      ref="form"
      v-slot="form"
      :validation-schema="schema"
      :initial-values
      keep-values
      @submit="handleSubmit"
      @invalid-submit="onInvalidSubmit"
    >
      <!-- basic form -->
      <BasicForm class="mt-4" />
      <!-- language form -->
      <MultiLanguageForm class="mt-8" />
      <!-- actions -->
      <div class="mt-8 flex justify-between gap-4">
        <NuxtLink :to="{ name: PAGE_MANAGEMENT_LIST, query: route.query }" class="btn btn-outline min-w-btn">
          List
        </NuxtLink>
        <Button
          type="submit"
          :loading="form.isSubmitting"
          class="btn btn-primary min-w-btn"
          label="Submit" icon="mdi:check"
        />
      </div>
    </Form>
  </div>
</template>

<style>
@reference "~/assets/css/main.css";

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
