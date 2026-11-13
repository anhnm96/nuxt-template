<script setup lang="ts">
import type { FactoryOpts } from 'imask'
import type { MaskReadings } from '~/composables/useMask'
// The subpaths, not `imask`: the full package registers every mask type, and each field below
// must depend on the registrations in `useMask`.
import MaskedEnum from 'imask/masked/enum'
import MaskedRange from 'imask/masked/range'

const PHONE = { mask: '+{1} (000) 000-0000' } as const
const DATE = { mask: Date } as const
const PERCENT = { mask: Number, min: 0, max: 100, autofix: true } as const
const AMOUNT = { mask: Number, scale: 2, radix: '.', thousandsSeparator: ',', padFractionalZeros: true } as const

const COUNTRIES = {
  us: { label: 'United States', options: { mask: '+{1} (000) 000-0000' } },
  jp: { label: 'Japan', options: { mask: '+{81} 00-0000-0000' } },
} as const

const unmaskedPhone = ref('15551234567')
const maskedPhone = ref('+1 (555) 123-4567')

const due = ref<Date | null>(new Date(2026, 0, 15))
const dueReadings = ref<MaskReadings<typeof DATE>>()

const percent = ref<number | null>(40)
const amount = ref<number | null>(1234.5)

const country = ref<keyof typeof COUNTRIES>('us')
const countryPhone = ref('')
// A new mask reads the old model, so an old number would come back corrected for the new country.
watch(country, () => {
  countryPhone.value = ''
})

const showLate = ref(false)
const latePhone = ref('15551234567')
const lateInput = useTemplateRef('lateInput')
useMask(lateInput, PHONE, { bound: 'unmasked', model: latePhone })

// One field for each mask type that `useMask` registers.
const pad2 = (n: number) => String(n).padStart(2, '0')
const SLASH_DATE = {
  mask: Date,
  pattern: 'Y/`m/`d',
  lazy: false,
  overwrite: true,
  autofix: true,
  blocks: {
    Y: { mask: MaskedRange, from: 1900, to: 2099 },
    m: { mask: MaskedRange, from: 1, to: 12, maxLength: 2 },
    d: { mask: MaskedRange, from: 1, to: 31, maxLength: 2 },
  },
  // imask types `format` with `Date | null`, so a custom `format` handles `null`.
  format: (date: Date | null) => date ? `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}` : '',
  parse: (text: string) => {
    const [year, month, day] = text.split('/').map(Number) as [number, number, number]
    return new Date(year, month - 1, day)
  },
} satisfies FactoryOpts
const HIDDEN_DIGITS = {
  mask: 'xxx-xx-0000',
  definitions: { x: { mask: '0', displayChar: '*', placeholderChar: '#' } },
  lazy: false,
  overwrite: true,
} satisfies FactoryOpts
const GERMAN_AMOUNT = {
  mask: Number,
  scale: 2,
  radix: ',',
  thousandsSeparator: '.',
  padFractionalZeros: true,
} satisfies FactoryOpts
const EURO = {
  mask: '€x',
  blocks: { x: { mask: Number, radix: '.', thousandsSeparator: ',' } },
} satisfies FactoryOpts
// `100%` is the only three-digit value: the `{1}` and the `/0/` digits allow nothing else.
const PERCENT_SUFFIX = {
  mask: [
    { mask: '' },
    { mask: '0%', lazy: false, placeholderChar: ' ' },
    { mask: '00%', lazy: false, placeholderChar: ' ' },
    { mask: '{1}xx%', definitions: { x: { mask: /0/ } }, lazy: false, placeholderChar: ' ' },
  ],
} satisfies FactoryOpts
// No `autofix`: the mask refuses a keystroke that goes past `max`, and corrects nothing.
const CAPPED_AMOUNT = { mask: Number, min: 100, max: 5000, thousandsSeparator: ',' } satisfies FactoryOpts
const CITY = { mask: MaskedEnum, enum: ['Kyoto', 'Osaka', 'Sapporo', 'Tokyo'] } satisfies FactoryOpts
const DIGITS_ZERO_TO_SIX = { mask: /^[0-6]+$/ } satisfies FactoryOpts
const RISING_DIGITS = {
  mask: (text: string) => /^\d*$/.test(text) && [...text].every((digit, i) => i === 0 || text[i - 1]! < digit),
} satisfies FactoryOpts

const slashDate = ref<Date | null>(new Date(2026, 8, 14))
const hiddenDigits = ref('123456789')
const germanAmount = ref<number | null>(4999)
const euro = ref('120000')
const percentSuffix = ref('50')
const cappedAmount = ref<number | null>(4999)
const city = ref('Tokyo')
const zeroToSix = ref('123456')
const rising = ref('')

const show = (value: unknown) => (value instanceof Date ? value.toDateString() : JSON.stringify(value))
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-10 p-8">
    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `bound="unmasked"` — the default
      </h2>
      <p class="text-sm opacity-70">
        The model holds the digits the user typed, and the fixed `1` of the mask.
      </p>
      <MaskedInput v-model="unmaskedPhone" :mask-options="PHONE" aria-label="Phone, unmasked" />
      <p class="text-sm opacity-70">
        {{ show(unmaskedPhone) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `bound="masked"` — the text as the field shows it
      </h2>
      <MaskedInput v-model="maskedPhone" bound="masked" :mask-options="PHONE" aria-label="Phone, masked" />
      <p class="text-sm opacity-70">
        {{ show(maskedPhone) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `bound="typed"` — a Partial Entry keeps the last date
      </h2>
      <p class="text-sm opacity-70">
        Delete the last digit: the model stays at 15 January. Tab away: the field shows it again.
        Clear the field: the model becomes `null`.
      </p>
      <MaskedInput
        v-model="due"
        bound="typed"
        :mask-options="DATE"
        placeholder="DD.MM.YYYY"
        aria-label="Due date"
        @accept="dueReadings = $event"
      />
      <p class="text-sm opacity-70">
        model: {{ show(due) }}
      </p>
      <p v-if="dueReadings" class="text-sm opacity-70">
        accept: masked {{ show(dueReadings.masked) }}, unmasked {{ show(dueReadings.unmasked) }},
        typed {{ show(dueReadings.typed) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        A corrected write returns to the model
      </h2>
      <p class="text-sm opacity-70">
        The mask allows 0 to 100. Write 150 from outside: the field shows 100, and so does the model.
      </p>
      <div class="flex items-center gap-2">
        <MaskedInput v-model="percent" bound="typed" :mask-options="PERCENT" aria-label="Percent" />
        <button class="btn btn-sm" @click="percent = 150">
          Write 150
        </button>
        <button class="btn btn-sm" @click="percent = null">
          Write null
        </button>
      </div>
      <p class="text-sm opacity-70">
        {{ show(percent) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        A number with a thousands separator
      </h2>
      <MaskedInput v-model="amount" bound="typed" :mask-options="AMOUNT" aria-label="Amount" />
      <p class="text-sm opacity-70">
        {{ show(amount) }}
      </p>
    </section>

    <section class="flex flex-col gap-4">
      <h2 class="font-medium">
        Mask types
      </h2>
      <p class="text-sm opacity-70">
        One field for each mask type that the component supports. The line under each field is
        its model.
      </p>
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="flex flex-col gap-1 text-sm">
          A date with its own format — `2026/02/31` is refused
          <MaskedInput v-model="slashDate" bound="typed" :mask-options="SLASH_DATE" />
          <span class="opacity-70">{{ show(slashDate) }}</span>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          A pattern that hides its first five digits
          <MaskedInput v-model="hiddenDigits" :mask-options="HIDDEN_DIGITS" />
          <span class="opacity-70">{{ show(hiddenDigits) }}</span>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          A number in German format
          <MaskedInput v-model="germanAmount" bound="typed" :mask-options="GERMAN_AMOUNT" />
          <span class="opacity-70">{{ show(germanAmount) }}</span>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          A number capped at 5,000 without `autofix` — a keystroke past the cap is refused
          <MaskedInput v-model="cappedAmount" bound="typed" :mask-options="CAPPED_AMOUNT" />
          <span class="opacity-70">{{ show(cappedAmount) }}</span>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          A number block after a fixed `€`
          <MaskedInput v-model="euro" :mask-options="EURO" />
          <span class="opacity-70">{{ show(euro) }}</span>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          A dynamic mask — `%` follows each digit, up to `100%`
          <MaskedInput v-model="percentSuffix" :mask-options="PERCENT_SUFFIX" />
          <span class="opacity-70">{{ show(percentSuffix) }}</span>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          An enum — one of four city names
          <MaskedInput v-model="city" :mask-options="CITY" />
          <span class="opacity-70">{{ show(city) }}</span>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          A `RegExp` — the digits 0 to 6 only
          <MaskedInput v-model="zeroToSix" :mask-options="DIGITS_ZERO_TO_SIX" />
          <span class="opacity-70">{{ show(zeroToSix) }}</span>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          A function — each digit is larger than the one before it
          <MaskedInput v-model="rising" :mask-options="RISING_DIGITS" />
          <span class="opacity-70">{{ show(rising) }}</span>
        </label>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Change the mask with `:key`
      </h2>
      <p class="text-sm opacity-70">
        The mask is read at mount. A new key mounts a new field with the new mask.
      </p>
      <div class="flex items-center gap-2">
        <select v-model="country" class="inputtext w-auto" aria-label="Country">
          <option v-for="(c, code) in COUNTRIES" :key="code" :value="code">
            {{ c.label }}
          </option>
        </select>
        <MaskedInput
          :key="country"
          v-model="countryPhone"
          :mask-options="COUNTRIES[country].options"
          aria-label="Phone for the selected country"
        />
      </div>
      <p class="text-sm opacity-70">
        {{ show(countryPhone) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `useMask` on an input that appears later
      </h2>
      <p class="text-sm opacity-70">
        The composable attaches the mask when the element appears, and shows the model at once.
      </p>
      <div class="flex items-center gap-2">
        <button class="btn btn-sm" @click="showLate = !showLate">
          {{ showLate ? 'Hide' : 'Show' }} the input
        </button>
        <input v-if="showLate" ref="lateInput" type="text" class="inputtext" aria-label="Late phone">
      </div>
      <p class="text-sm opacity-70">
        {{ show(latePhone) }}
      </p>
    </section>
  </div>
</template>
