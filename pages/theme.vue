<script lang="ts" setup>
const themes = ['base', 'ocean', 'rainforest', 'candy']
</script>

<template>
  <div class="m-8">
    <h2 class="text-lg text-slate-900 font-semibold">
      Color shades
    </h2>
    <div class="mt-2 flex flex-wrap gap-6">
      <div v-for="theme in themes" :key="theme" class="inline-flex overflow-hidden rounded-md" :data-theme="theme">
        <div
          class="grid h-16 w-16 place-items-end bg-primary-50 p-1 text-primary-900 font-semibold leading-none"
        >
          50
        </div>
        <div
          class="grid h-16 w-16 place-items-end bg-primary-100 p-1 text-primary-900 font-semibold leading-none"
        >
          100
        </div>
        <div
          class="grid h-16 w-16 place-items-end bg-primary-200 p-1 text-primary-900 font-semibold leading-none"
        >
          200
        </div>
        <div
          class="grid h-16 w-16 place-items-end bg-primary-300 p-1 text-primary-900 font-semibold leading-none"
        >
          300
        </div>
        <div
          class="grid h-16 w-16 place-items-end bg-primary-400 p-1 text-primary-900 font-semibold leading-none"
        >
          400
        </div>
        <div
          class="grid h-16 w-16 place-items-end bg-primary-500 p-1 text-primary-50 font-semibold leading-none"
        >
          500
        </div>
        <div
          class="grid h-16 w-16 place-items-end bg-primary-600 p-1 text-primary-50 font-semibold leading-none"
        >
          600
        </div>
        <div
          class="grid h-16 w-16 place-items-end bg-primary-700 p-1 text-primary-50 font-semibold leading-none"
        >
          700
        </div>
        <div
          class="grid h-16 w-16 place-items-end bg-primary-800 p-1 text-primary-50 font-semibold leading-none"
        >
          800
        </div>
        <div
          class="grid h-16 w-16 place-items-end bg-primary-900 p-1 text-primary-50 font-semibold leading-none"
        >
          900
        </div>
      </div>
    </div>

    <!--
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  Let's bring back the support for opacity modifiers!
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  -->

    <div class="mt-16">
      <h2 class="text-lg text-slate-900 font-semibold">
        Color opacity
      </h2>
      <div class="grid mt-2 gap-6">
        <div v-for="theme in themes" :key="theme" class="flex gap-4" :data-theme="theme">
          <div
            class="grid h-16 w-16 place-items-end rounded-md bg-primary-600 p-1 text-primary-50 font-semibold leading-none ring-2 ring-black/10 ring-inset"
          >
            100%
          </div>
          <div
            class="grid h-16 w-16 place-items-end rounded-md bg-primary-600 bg-opacity-70 p-1 text-primary-50 font-semibold leading-none ring-2 ring-black/10 ring-inset"
          >
            70%
          </div>
          <div
            class="grid h-16 w-16 place-items-end rounded-md bg-primary-600/50 p-1 text-primary-900 font-semibold leading-none ring-2 ring-black/10 ring-inset"
          >
            50%
          </div>
          <div
            class="grid h-16 w-16 place-items-end rounded-md bg-primary-600 bg-opacity-30 p-1 text-primary-900 font-semibold leading-none ring-2 ring-black/10 ring-inset"
          >
            30%
          </div>
          <div
            class="grid h-16 w-16 place-items-end rounded-md bg-primary-600/[0.1] p-1 text-primary-900 font-semibold leading-none ring-2 ring-black/10 ring-inset"
          >
            10%
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
