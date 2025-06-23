<script setup lang="ts">
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
  prefix: 120000,
  suffix: 50,
  suffix2: 50,
})
const regex = ref({
  allowZeroToSix: 123456,
  zeroToNine: 'a123',
})
const pattern = ref({
  pattern1: '',
  pattern2: '',
})
const fn = ref({
  fn1: '',
})
</script>

<template>
  <div class="p-4">
    <!-- min max value -->
    <div>
      <h2 class="text-base">
        Min and Max value (100 - 5000)
      </h2>
      <div class="flex flex-wrap gap-4 mt-2">
        <!-- basic min max -->
        <div class="flex flex-col gap-1">
          <Label>Auto fix min and max value</Label>
          <MaskedInput
            v-model="minMax.basic" :mask-options="{
              mask: Number,
              min: 100,
              max: 5000,
              scale: 2,
              radix: '.',
              thousandsSeparator: ',',
              autofix: true,
            }" is-number
          />
        </div>
        <!-- Prevent input en-US -->
        <div class="flex flex-col gap-1">
          <Label>(en-US format) Prevent input when value reach max limit</Label>
          <MaskedInput
            v-model="minMax.preventInputWhenReachLimitUs"
            :mask-options="{
              mask: Number,
              min: 100,
              max: 5000,
              scale: 2,
              radix: '.',
              thousandsSeparator: ',',
              padFractionalZeros: true,
              autofix: true,
            }" is-number
          />
        </div>
        <!-- Prevent input de-DE -->
        <div class="flex flex-col gap-1">
          <Label>(de-DE  format) Prevent input when value reach max limit</Label>
          <MaskedInput
            v-model="minMax.preventInputWhenReachLimitUs"
            :mask-options="{
              mask: Number,
              min: 100,
              max: 5000,
              scale: 2,
              radix: ',',
              thousandsSeparator: '.',
              padFractionalZeros: true,
            }" is-number
          />
        </div>
      </div>
    </div>

    <!-- Prefix and Suffix -->
    <div>
      <h2 class="text-base">
        Fraction Digits
      </h2>
      <div class="flex flex-wrap gap-4 mt-2">
        <!-- Integer Only -->
        <div class="flex flex-col gap-1">
          <Label>Integer only</Label>
          <MaskedInput
            v-model="fractionDigits.integerOnly"
            :mask-options="{
              mask: Number,
              radix: '.',
              thousandsSeparator: ',',
              scale: 0,
            }" is-number
          />
        </div>
        <!-- Min-Max Fraction Digits -->
        <div class="flex flex-col gap-1">
          <Label>Min-Max Fraction Digits</Label>
          <MaskedInput
            v-model="fractionDigits.fraction"
            :mask-options="{
              mask: Number,
              scale: 2,
              radix: '.',
              thousandsSeparator: ',',
              padFractionalZeros: true,
              autofix: true,
            }" is-number
          />
        </div>
      </div>
    </div>

    <!-- Fraction Digits -->
    <div class="mt-4">
      <h2 class="text-base">
        Prefix and Suffix
      </h2>
      <div class="flex flex-wrap gap-4 mt-2">
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
      <div class="flex flex-wrap gap-4 mt-2">
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
      <div class="flex flex-wrap gap-4 mt-2">
        <!-- pattern 1 -->
        <div class="flex flex-col gap-1">
          <Label>{{ `###-##-####% with hidden characters: [${pattern.pattern1}]` }}</Label>
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
              overwrite: 'shift',
            }"
          />
        </div>
        <!-- pattern 2 -->
        <div class="flex flex-col gap-1">
          <Label>{{ `###-##-####% with hidden characters: [${pattern.pattern2}]` }}</Label>
          <MaskedInput
            v-model="pattern.pattern2"
            :mask-options="{
              mask: 'xxx-xx-nnnn%',
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
              overwrite: 'shift',
            }"
          />
        </div>
      </div>
    </div>
    <!-- Function -->
    <div class="mt-4">
      <h2 class="text-base">
        Function
      </h2>
      <div class="flex flex-wrap gap-4 mt-2">
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
