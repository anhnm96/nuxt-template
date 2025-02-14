<script setup lang="ts">
import { FormContextKey } from 'vee-validate'
import SelectCountryDialog from '~/components/dialogs/SelectCountryDialog.vue'

const formContext = inject(FormContextKey)!

const id = useId()
const { t } = useI18n()

function handleSelectImage(file: FileList) {
  const img = document.getElementById(`images__${id}`) as HTMLImageElement
  const reader = new FileReader()
  reader.onloadend = function () {
    img.src = reader.result as string
  }
  reader.readAsDataURL(file[0])
}

function handleInputCode(event: Event) {
  formContext.setFieldValue('name', filterInputValue(event, (value: string) => filterNumberUpperAlphaUnderscoreOnly(value.toUpperCase())))
}

const dialogStore = useDialogStore()
async function showSelectCountryDialog() {
  const result = await dialogStore.showDialog({ component: markRaw(SelectCountryDialog) })
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
      <!-- name -->
      <Label :for="`name__${id}`" required>Name</Label>
      <div>
        <div class="flex items-end gap-2">
          <InputWrapper class="max-w-4xl w-full">
            <Field
              :id="`name__${id}`"
              class="inputtext"
              :class="[formContext.errors.value.name && 'invalid']"
              name="name" placeholder="name" autocomplete="new-password"
              @input="handleInputCode($event);formContext.setFieldError('name', '')"
            />
          </InputWrapper>
          <CharacterCounter :value="formContext.values.name" :max-length="15" />
        </div>
        <TransitionHeight :show="!!formContext.errors.value.name">
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
              :class="[formContext.errors.value.url && 'invalid']"
              name="url" placeholder="URL" autocomplete="new-password"
              @input="formContext.setFieldError('url', '')"
            />
          </InputWrapper>
          <CharacterCounter :value="formContext.values.url" :max-length="255" />
        </div>
        <TransitionHeight :show="!!formContext.errors.value.url">
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
            <Icon v-show="!formContext.values.image" name="bx:image-add" size="48" />
            <!-- image preview -->
            <div v-show="formContext.values.image" class="absolute inset-0">
              <img :id="`images__${id}`" class="h-full w-full object-cover">
            </div>
          </div>
          <div class="flex flex-col">
            <ul class="list-bullet text-xs text-slate-400">
              <li>상품 이미지는 최대 1개까지 첨부 가능합니다.</li>
              <li>권장 사이즈 : 800x600 / 최대 100 KB</li>
            </ul>
            <Field v-if="!formContext.values.image" v-slot="{ handleChange }" name="image">
              <FileUpload
                :id="`image-${id}`"
                :pt="{ input: { onChange: handleChange } }"
                class="mt-auto self-baseline"
                :accepted-file-types="['image/*']"
                @change="handleSelectImage"
              />
            </Field>
            <button
              v-else class="btn bg-error mt-auto self-baseline text-white"
              @click="formContext.setFieldValue('image', null)"
            >
              Clear Image
            </button>
          </div>
        </div>
        <p class="mt-1 text-xs text-slate-400">
          - {{ t('game_management_register.image_description') }}
        </p>
        <TransitionHeight :show="!!formContext.errors.value.image">
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
          :class="{ 'bg-slate-400': !formContext.values.countries.length }"
          :value="formContext.values.countries.length"
        />
        <TransitionHeight :show="formContext.submitCount.value > 0 && !!formContext.errors.value.countries">
          <ErrorMessage as="p" name="countries" class="text-error mt-1 text-left" />
        </TransitionHeight>
      </div>
    </div>
  </div>
</template>
