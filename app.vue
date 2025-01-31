<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/valibot'
import * as v from 'valibot'

function logError(e: any) {
  console.error(e)
}

const id = useId()
function handleSubmit(values: any, actions: any) {
  console.info('values', values)
  console.log('actions', actions)
}

const fieldsOrder = ['email', 'password']
function onInvalidSubmit({ errors }: any) {
  const invalidFieldKeys = Object.keys(errors)
  const firstInvalidFieldKey = fieldsOrder.find(field => invalidFieldKeys.includes(field))
  if (!firstInvalidFieldKey)
    throw new Error(`Could not find firstInvalidFieldKey in ${fieldsOrder} from ${invalidFieldKeys}`)
  focusField(firstInvalidFieldKey)
}

const schema = toTypedSchema(
  v.object({
    // name: v.pipe(v.string()),
    email: v.pipe(v.string('required'), v.nonEmpty('required'), v.email('Invalid email')),
    password: v.pipe(v.string('required'), v.minLength(6, 'Must be at least 6 characters')),
  }),
)

function focusField(fieldName: string) {
  const el = document.getElementById(`${fieldName}-${id}`)
  if (!el) return
  el.focus()
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
</script>

<template>
  <NuxtErrorBoundary @error="logError">
    <div class="py-2 text-center">
      <div class="mx-auto mt-4 w-[400px] border border-slate-200 rounded-md py-2 text-center">
        <Form
          id="register-form"
          v-slot="{ errors, resetForm, setFieldError }"
          class="flex flex-col gap-4 px-4"
          :validation-schema="schema"
          @submit="handleSubmit"
          @invalid-submit="onInvalidSubmit"
        >
          <div>
            <InputWrapper>
              <Field
                :id="`email-${id}`"
                class="inputtext w-full"
                :class="[errors.email && 'invalid']"
                name="email" placeholder="email" autocomplete="new-password"
                @input="setFieldError('email', '')"
              />
            </InputWrapper>
            <TransitionHeight :show="!!errors.email">
              <ErrorMessage as="p" name="email" class="text-error mt-1 text-left" />
            </TransitionHeight>
          </div>
          <div>
            <InputWrapper>
              <Field
                :id="`password-${id}`"
                class="inputtext w-full"
                :class="[errors.password && 'invalid']"
                type="password" name="password" placeholder="password" autocomplete="new-password"
                @input="setFieldError('password', '')"
              />
            </InputWrapper>
            <TransitionHeight :show="!!errors.password">
              <ErrorMessage as="p" name="password" class="text-error mt-1 text-left" />
            </TransitionHeight>
          </div>
          <div class="flex justify-center gap-4">
            <button type="button" @click="resetForm();focusField(fieldsOrder[0])">
              Reset
            </button>
            <button type="submit">
              Submit
            </button>
          </div>
        </Form>
      </div>
    </div>
    <NuxtPage />
    <AppDialog />
  </NuxtErrorBoundary>
</template>
