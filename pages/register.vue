<script lang="ts" setup>
import * as v from 'valibot'

const id = useId()
const formRef = useTemplateRef('form')

const initialValues = {
  name: '',
  url: '',
}

function handleSubmit(values: any) {
  console.info('values', values)
}

const fieldsOrder = ['name', 'url', 'image']
function onInvalidSubmit({ errors }: any) {
  const invalidFieldKeys = Object.keys(errors)
  const firstInvalidFieldKey = fieldsOrder.find(field => invalidFieldKeys.includes(field))
  if (!firstInvalidFieldKey) {
    console.error(`Could not find firstInvalidFieldKey in ${fieldsOrder} from ${invalidFieldKeys}`)
    return
  }
  focusField(firstInvalidFieldKey)
}

const schema = toTypedSchema(
  v.object({
    name: v.pipe(v.string(), v.nonEmpty('required'), v.maxLength(15)),
    url: v.optional(
      v.union([
        v.pipe(
          v.string(),
          v.maxLength(255),
          v.url('The url is badly formatted.'),
        ),
        v.literal(''),
      ]),
    ),
    image: v.pipe(
      v.file('File is required'),
      v.maxSize(1000000, `Please select a file smaller than ${1} MB.`),
    ),
  }),
)

function focusField(fieldName: string) {
  const el = document.getElementById(`${fieldName}-${id}`)
  if (!el) return
  el.focus()
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function handleSelectImage(file: FileList) {
  const img = document.createElement('img')
  const reader = new FileReader()
  reader.onloadend = function () {
    img.src = reader.result as string
  }
  reader.readAsDataURL(file[0])
  document.getElementById(`images-${id}`)?.appendChild(img)
}

function handleInputCode(event: Event) {
  formRef.value!.setFieldValue('name', filterInputValue(event, (value: string) => filterNumberUpperAlphaUnderscoreOnly(value.toUpperCase())))
}
</script>

<template>
  <div class="mx-auto max-w-7xl p-4">
    register
    <Form
      ref="form"
      v-slot="{ values, errors, setFieldError }"
      :validation-schema="schema"
      :initial-values
      @submit="handleSubmit"
      @invalid-submit="onInvalidSubmit"
    >
      <div class="grid-table with-label">
        <!-- name -->
        <div>Name</div>
        <div>
          <div class="flex items-end gap-2">
            <InputWrapper class="max-w-4xl w-full">
              <Field
                :id="`name-${id}`"
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
        <div>URL</div>
        <div>
          <div class="flex items-end gap-2">
            <InputWrapper class="max-w-4xl w-full">
              <Field
                :id="`url-${id}`"
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
        <div>
          Image
        </div>
        <div>
          <Field v-slot="{ handleChange }" name="image">
            <FileUpload
              v-if="!values.image"
              :id="`image-${id}`"
              :pt="{ input: { onChange: handleChange } }"
              @change="handleSelectImage"
            />
            <div :id="`images-${id}`" class="[&>*]:max-h-[200px]" />
          </Field>
          <TransitionHeight :show="!!errors.image">
            <ErrorMessage as="p" name="image" class="text-error mt-1 text-left" />
          </TransitionHeight>
        </div>
      </div>
      <div class="mt-4 flex justify-between gap-4">
        <NuxtLink to="/list" class="btn btn-outline min-w-btn">
          List
        </NuxtLink>
        <Button type="submit" class="min-w-btn btn-primary">
          Submit
        </Button>
      </div>
    </Form>
  </div>
</template>

<style>
@reference "../assets/css/main.css";
.grid-table {
  @apply grid grid-cols-[auto_1fr] border-slate-200 border-t border-l;

  & > * {
    @apply border-slate-200 border-r border-b p-4;
  }

  &.with-label > *:nth-child(odd) {
      @apply bg-slate-50 flex items-center;
  }
}
</style>
