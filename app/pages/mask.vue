<script setup lang="ts">
import { MaskedRange } from 'imask'

const minMax = ref({
  basic: 200,
  preventInputWhenReachLimitUs: 4999,
  preventInputWhenReachLimitDe: 4999,
})
const fractionDigits = ref({
  integerOnly: 123456,
  fraction: 123456.78,
})
const prefixAndSuffix = ref({
  prefix: '120000',
  suffix: '50',
  suffix2: '50',
})
const regex = ref({
  allowZeroToSix: '123456',
  zeroToNine: 'a123',
})
const pattern = ref({
  pattern1: '',
  pattern2: '12345789',
})
const fn = ref({
  fn1: '',
})

const inputRef = useTemplateRef('inputRef')
const { unmasked, masked: maskedValue } = useMask(inputRef, {
  mask: '+{1} (000) 000-0000',
})
const { initMask } = useMask(() => document.getElementById('phone') as any, {
  mask: '+{1} (000) 000-0000',
}, false)
const raw = ref('')
const masked = ref('')
const typed = ref('')

const maskOptions = {
  mask: Date,
  pattern: 'Y/`m/`d',
  lazy: false,
  overwrite: true,
  autofix: true,
  eager: 'remove',
  blocks: {
    d: {
      mask: MaskedRange,
      from: 1,
      to: 31,
      maxLength: 2,
    },
    m: {
      mask: MaskedRange,
      from: 1,
      to: 12,
      maxLength: 2,
    },
    Y: {
      mask: MaskedRange,
      from: 1900,
      to: 2099,
    },
  },
  // define date -> str convertion
  format: (date: Date) => {
    let day: number | string = date.getDate()
    let month: number | string = date.getMonth() + 1
    const year = date.getFullYear()

    if (day < 10) day = `0${day}`
    if (month < 10) month = `0${month}`

    return [year, month, day].join('/')
  },

  // define str -> date convertion
  parse: (str: string) => {
    const yearMonthDay = str.split('/') as [string, string, string]
    return new Date(Number(yearMonthDay[0]), Number(yearMonthDay[1]) - 1, Number(yearMonthDay[2]))
  },
} as any
</script>

<template>
  <div class="p-4">
    <div>
      raw: {{ raw }}
    </div>
    <div>
      masked: {{ masked }}
    </div>
    <div>
      typed: {{ typed }}
    </div>
    <MaskedInput
      v-model:masked="masked"
      v-model:typed="typed"
      :mask-options
    />
    <!-- min max value -->
    <div>
      <h2 class="text-base">
        Min and Max value (100 - 5000)
      </h2>
      <div class="mt-2 flex flex-wrap gap-4">
        <!-- basic min max -->
        <div class="flex flex-col gap-1">
          <Label>Auto fix min and max value {{ typeof minMax.basic }} {{ minMax.basic }}</Label>
          <MaskedInput
            v-model:typed="minMax.basic"
            :model-value="minMax.basic.toString()"
            :mask-options="{
              mask: Number,
              min: 100,
              max: 5000,
              scale: 2,
              radix: '.',
              thousandsSeparator: ',',
              autofix: true,
            }"
          />
        </div>
        <!-- Prevent input en-US -->
        <div class="flex flex-col gap-1">
          <Label>(en-US format) Prevent input when value reach max limit</Label>
          <MaskedInput
            v-model:typed="minMax.preventInputWhenReachLimitUs"
            :model-value="minMax.preventInputWhenReachLimitUs.toString()"
            :mask-options="{
              mask: Number,
              min: 100,
              max: 5000,
              scale: 2,
              radix: '.',
              thousandsSeparator: ',',
              padFractionalZeros: true,
              autofix: true,
            }"
          />
        </div>
        <!-- Prevent input de-DE -->
        <div class="flex flex-col gap-1">
          <Label>(de-DE  format) Prevent input when value reach max limit</Label>
          <MaskedInput
            v-model:typed="minMax.preventInputWhenReachLimitDe"
            :model-value="minMax.preventInputWhenReachLimitUs.toString()"
            :mask-options="{
              mask: Number,
              min: 100,
              max: 5000,
              scale: 2,
              radix: ',',
              thousandsSeparator: '.',
              padFractionalZeros: true,
            }"
          />
        </div>
      </div>
    </div>

    <!-- Prefix and Suffix -->
    <div>
      <h2 class="text-base">
        Fraction Digits
      </h2>
      <div class="mt-2 flex flex-wrap gap-4">
        <!-- Integer Only -->
        <div class="flex flex-col gap-1">
          <Label>Integer only</Label>
          <MaskedInput
            v-model:typed="fractionDigits.integerOnly"
            :model-value="fractionDigits.integerOnly.toString()"
            :mask-options="{
              mask: Number,
              radix: '.',
              thousandsSeparator: ',',
              scale: 0,
            }"
          />
        </div>
        <!-- Min-Max Fraction Digits -->
        <div class="flex flex-col gap-1">
          <Label>Min-Max Fraction Digits</Label>
          <MaskedInput
            v-model:typed="fractionDigits.fraction"
            :model-value="fractionDigits.fraction.toString()"
            :mask-options="{
              mask: Number,
              scale: 2,
              radix: '.',
              thousandsSeparator: ',',
              padFractionalZeros: true,
              autofix: true,
            }"
          />
        </div>
      </div>
    </div>

    <!-- Fraction Digits -->
    <div class="mt-4">
      <h2 class="text-base">
        Prefix and Suffix
      </h2>
      <div class="mt-2 flex flex-wrap gap-4">
        <!--  -->
        <div class="flex flex-col gap-1">
          <Label>{{ `Prefix with '€' sign: [${prefixAndSuffix.prefix}]` }}</Label>
          <MaskedInput
            v-model="prefixAndSuffix.prefix"
            :mask-options="{
              mask: '€x',
              blocks: {
                x: {
                  mask: Number,
                  radix: '.',
                  thousandsSeparator: ',',
                },
              },
              lazy: true,
            }"
          />
        </div>
        <!--  -->
        <div class="flex flex-col gap-1">
          <Label>{{ `Suffix with '%' sign: [${prefixAndSuffix.suffix}]` }}</Label>
          <MaskedInput
            v-model="prefixAndSuffix.suffix"
            :mask-options="{
              mask: 'x%',
              blocks: {
                x: {
                  mask: Number,
                  radix: '.',
                  thousandsSeparator: ',',
                  min: 0,
                  max: 100,
                },
              },
              lazy: false,
            }"
          />
        </div>
        <!--  -->
        <div class="flex flex-col gap-1">
          <Label>{{ `Suffix with '%' sign: [${prefixAndSuffix.suffix2}]` }}</Label>
          <MaskedInput
            v-model="prefixAndSuffix.suffix2"
            :mask-options="{
              mask: [
                { mask: '' },
                { mask: '0%', lazy: false, placeholderChar: ' ' },
                { mask: '00%', lazy: false, placeholderChar: ' ' },
                { mask: '{1}xx%',
                  definitions: {
                    x: {
                      mask: /[0]/,
                    },
                  },
                  lazy: false,
                  placeholderChar: ' ' },
              ],
              lazy: false,
              autofix: true,
            }"
          />
        </div>
      </div>
    </div>
    <!-- Regex -->
    <div class="mt-4">
      <h2 class="text-base">
        Regex
      </h2>
      <div class="mt-2 flex flex-wrap gap-4">
        <!-- Only allow 0-6 -->
        <div class="flex flex-col gap-1">
          <Label>Only allow 0-6</Label>
          <MaskedInput
            v-model="regex.allowZeroToSix"
            :mask-options="{ mask: /^[0-6]+$/ }"
          />
        </div>
        <!-- Only allow 'a' and 123 -->
        <div class="flex flex-col gap-1">
          <Label>Only allow 'a' and 123</Label>
          <MaskedInput
            v-model="regex.zeroToNine"
            :mask-options="{ mask: /^[a123]+$/ }"
          />
        </div>
      </div>
    </div>
    <!-- Pattern -->
    <div class="mt-4">
      <h2 class="text-base">
        Pattern
      </h2>
      <div class="mt-2 flex flex-wrap gap-4">
        <!-- pattern 1 -->
        <div class="flex flex-col gap-1">
          <Label>###-##-####% with hidden characters</Label>
          <MaskedInput
            v-model="pattern.pattern1"
            :mask-options="{
              mask: 'xxx{-}xx{-}nnnn{%}',
              definitions: {
                x: {
                  mask: '0',
                  displayChar: '*',
                  placeholderChar: '#',
                },
                n: {
                  mask: '0',
                  placeholderChar: '_',
                },
              },
              lazy: false,
              overwrite: true,
            }"
          />
          <p>{{ pattern.pattern1 }}</p>
        </div>
        <!-- pattern 2 -->
        <div class="flex flex-col gap-1">
          <Label>###-##-####% with hidden characters</Label>
          <MaskedInput
            v-model="pattern.pattern2"
            :mask-options="{
              mask: 'xxx-xx-0000',
              definitions: {
                x: {
                  mask: '0',
                  displayChar: '*',
                  placeholderChar: '#',
                },
              },
              lazy: false,
              overwrite: true,
            }"
          />
          <p>{{ pattern.pattern2 }}</p>
        </div>
      </div>
    </div>
    <!-- composable -->
    <div class="mt-4">
      <h2 class="text-base">
        Composable {{ unmasked }} {{ maskedValue }}
      </h2>
      <div class="mt-2 flex flex-wrap gap-4">
        <div class="flex gap-2">
          <input ref="inputRef" type="text" class="inputtext" placeholder="+1 (___) ___-____">
        </div>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm" @click="initMask">
            Activate
          </button>
          <input id="phone" type="text" class="inputtext" placeholder="+1 (___) ___-____">
        </div>
      </div>
    </div>
    <!-- Function -->
    <div class="mt-4">
      <h2 class="text-base">
        Function
      </h2>
      <div class="mt-2 flex flex-wrap gap-4">
        <!-- function 1 -->
        <div class="flex flex-col gap-1">
          <Label>{{ `Growing sequence from 0 to 9: [${fn.fn1}]` }}</Label>
          <MaskedInput
            v-model="fn.fn1"
            :mask-options="{
              mask: (value: string) => /^\d*$/.test(value)
                && value.split('').every((ch: string, i: number) => {
                  const prevCh = value[i - 1];
                  return !prevCh || prevCh < ch;
                }),
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
