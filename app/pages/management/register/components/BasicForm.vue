<script setup lang="ts">
import { FormContextKey } from 'vee-validate'
import SelectCountryDialog from '~/components/dialogs/SelectCountryDialog.vue'
import { useCategories } from '~/queries/categories'
import { injectGameRegisterContext } from '../index.vue'

const formContext = inject(FormContextKey)!
const { formId, maxlength, isEditMode } = injectGameRegisterContext()
const dialogStore = useDialogStore()

const { t } = useI18n()

const { data: categories, isLoading: isLoadingCategories, refetch: fetchCategories } = useCategories()
fetchCategories().then(({ data }) => {
  formContext.setFieldValue('category', data?.[0]?.slug)
  changeTracker.track(formContext.values)
})

async function updateCategory(newValue: string) {
  const currentValue = formContext.values.category
  if (currentValue === newValue) return

  if (changeTracker.changedProps(formContext.values).length > 0) {
    const result = await dialogStore.showConfirm({
      description: 'Do you want to update?',
    })
    if (!result) {
      // force rerender and revert to previous value
      formContext.setFieldValue('category', '')
      await nextTick()
      formContext.setFieldValue('category', currentValue)
      return
    }
  }

  formContext.resetForm({ values: { category: newValue } })
  changeTracker.track(formContext.values)
}

function handleSelectImage(file: FileList) {
  const reader = new FileReader()
  reader.onloadend = function () {
    formContext.values.image = reader.result as string
  }
  reader.readAsDataURL(file[0] as any)
}

function handleInputCode(event: Event) {
  formContext.setFieldValue('name', filterInputValue(event, (value: string) => filterNumberUpperAlphaUnderscoreOnly(value.toUpperCase())))
}

async function showSelectCountryDialog() {
  const result = await dialogStore.showDialog({
    component: markRaw(SelectCountryDialog),
    props: {
      defaultCountryLocales: formContext.values.countries,
      disabledCountryCodes: ['CA', 'GL', 'MX'],
    },
  })
  if (!result) return
  formContext.setFieldValue('countries', result)
}
</script>

<template>
  <div>
    <h2 class="text-lg font-medium">
      {{ t('game_management_register.basic_form') }}
    </h2>

    <div class="grid-table with-label mt-2">
      <!-- category -->
      <Label class="w-60" :for="`category__${formId}`" required>Category</Label>
      <div>
        <div class="flex items-end gap-2">
          <Select
            :model-value="formContext.values.category"
            class="w-full max-w-4xl"
            :label-id="`category__${formId}`"
            option-label="name"
            option-value="slug"
            :placeholder="t('game_dialog.placeholder_select')"
            :reset-filter-on-hide="false"
            :options="categories"
            :scroll-height="categories?.length ?? 0 > 6 ? '18.5rem' : '19rem'"
            :filter="(categories?.length ?? 0) > 6"
            :loading="isLoadingCategories"
            :disabled="isEditMode"
            @update:model-value="updateCategory"
          />
          <div class="min-w-20" />
        </div>
        <TransitionHeight :show="formContext.submitCount.value > 0 && !!formContext.errors.value.category">
          <ErrorMessage as="p" name="category" class="mt-1 max-w-4xl text-left text-error" />
        </TransitionHeight>
      </div>
      <!-- name -->
      <Label :for="`name__${formId}`" required>Name</Label>
      <div>
        <div class="flex items-end gap-2">
          <InputWrapper v-model="formContext.values.name" class="w-full max-w-4xl">
            <Field
              :id="`name__${formId}`"
              class="inputtext"
              :class="[formContext.errors.value.name && 'invalid']"
              name="name" placeholder="name" autocomplete="new-password"
              @input="handleInputCode($event);formContext.setFieldError('name', '')"
            />
          </InputWrapper>
          <CharacterCounter :value="formContext.values.name" :max-length="maxlength.name" />
        </div>
        <TransitionHeight :show="!!formContext.errors.value.name">
          <ErrorMessage as="p" name="name" class="mt-1 max-w-4xl text-left text-error" />
        </TransitionHeight>
      </div>
      <!-- url -->
      <Label :for="`url__${formId}`">URL</Label>
      <div>
        <div class="flex items-end gap-2">
          <InputWrapper v-model="formContext.values.url" class="w-full max-w-4xl">
            <Field
              :id="`url__${formId}`"
              class="inputtext"
              :class="[formContext.errors.value.url && 'invalid']"
              name="url" placeholder="URL" autocomplete="new-password"
              @input="formContext.setFieldError('url', '')"
            />
          </InputWrapper>
          <CharacterCounter :value="formContext.values.url" :max-length="maxlength.url" />
        </div>
        <TransitionHeight :show="!!formContext.errors.value.url">
          <ErrorMessage as="p" name="url" class="mt-1 text-left text-error" />
        </TransitionHeight>
      </div>
      <!-- image -->
      <Label required>
        Image
      </Label>
      <div>
        <div class="flex gap-4">
          <div class="relative grid h-24 w-40 place-items-center overflow-hidden rounded border border-slate-200 bg-slate-50 text-gray-400">
            <Icon v-show="!formContext.values.image" name="bx:image-add" size="48" />
            <!-- image preview -->
            <div v-show="formContext.values.image" class="absolute inset-0">
              <img
                :id="`images__${formId}`" :src="formContext.values.image"
                class="h-full w-full object-cover"
              >
            </div>
          </div>
          <div class="flex flex-col">
            <ul class="list-bullet text-xs text-slate-400">
              <li>상품 이미지는 최대 1개까지 첨부 가능합니다.</li>
              <li>권장 사이즈 : 800x600 / 최대 100 KB</li>
            </ul>
            <Field v-if="!formContext.values.image" v-slot="{ handleChange }" name="image">
              <FileUpload
                :id="`image-${formId}`"
                :input-props="{ onChange: handleChange }"
                class="mt-auto self-baseline"
                :accepted-file-types="['image/*']"
                @change="handleSelectImage"
              />
            </Field>
            <button
              v-else class="btn mt-auto self-baseline bg-error text-white"
              @click="formContext.setFieldValue('image', null)"
            >
              Clear Image
            </button>
          </div>
        </div>
        <p class="mt-1 text-xs text-slate-400">
          - {{ t('game_management_register.image_description') }}
        </p>
        <TransitionHeight :show="formContext.submitCount.value > 0 && !!formContext.errors.value.image">
          <ErrorMessage as="p" name="image" class="mt-1 text-left text-error" />
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
          :class="{ 'bg-slate-400': !formContext.values.countries.length }"
          :value="formContext.values.countries.length"
        />
        <TransitionHeight :show="formContext.submitCount.value > 0 && !!formContext.errors.value.countries">
          <ErrorMessage as="p" name="countries" class="mt-1 text-left text-error" />
        </TransitionHeight>
      </div>
    </div>
  </div>
</template>
