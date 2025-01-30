<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/valibot'
import * as v from 'valibot'

function logError(e: any) {
  console.error(e)
}
function handleSubmit(values: any, actions: any) {
  console.info('values', values)
  console.log('actions', actions)
  // actions.resetForm()
}

function onInvalidSubmit({ errors, results }: any) {
  console.log(errors)
  console.log(results)
}

const schema = toTypedSchema(
  v.object({
    // name: v.pipe(v.string()),
    email: v.pipe(v.string('required'), v.nonEmpty('required'), v.email('Invalid email')),
    password: v.pipe(v.string('required'), v.minLength(6, 'Must be at least 6 characters')),
  }),
)
</script>

<template>
  <NuxtErrorBoundary @error="logError">
    <div class="py-2 text-center">
      <Form
        v-slot="{ errors }"
        class="flex flex-col gap-4"
        :validation-schema="schema"
        @submit="handleSubmit"
        @invalid-submit="onInvalidSubmit"
      >
        <div>
          <InputWrapper>
            <Field class="inputtext" :class="[errors.email && 'invalid']" name="email" placeholder="email" autocomplete="new-password" />
          </InputWrapper>
          <ErrorMessage name="email" />
        </div>
        <div>
          <InputWrapper>
            <Field class="inputtext" :class="[errors.password && 'invalid']" type="password" name="password" placeholder="password" autocomplete="new-password" />
          </InputWrapper>
          <ErrorMessage name="password" />
        </div>
        <button type="submit">
          Submit
        </button>
      </Form>
    </div>
    <NuxtPage />
    <AppDialog />
  </NuxtErrorBoundary>
</template>
