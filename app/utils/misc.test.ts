import { faker } from '@faker-js/faker'
import { consoleError } from '~~/tests/setup-vitest'
import { getErrorMessage, getPtValue, normalizePt } from './misc'

it('error object returns message', () => {
  const message = faker.lorem.words(2)
  expect(getErrorMessage(new Error(message))).toBe(message)
})

it('string returns itself', () => {
  const message = faker.lorem.words(2)
  expect(getErrorMessage(message)).toBe(message)
})

it('undefined falls back to Unknown', () => {
  consoleError.mockImplementation(() => {})
  expect(getErrorMessage(undefined)).toBe('Unknown Error')
  expect(consoleError).toHaveBeenCalledWith(
    'Unable to get error message for error',
    undefined,
  )
  expect(consoleError).toHaveBeenCalledTimes(1)
})

it('normalizePt treats a string as a class shorthand', () => {
  expect(normalizePt('text-sm')).toEqual({ class: 'text-sm' })
})

it('normalizePt treats an array as a class shorthand, verbatim', () => {
  // Falsy and object members are handed to Vue untouched — normalizeClass
  // resolves them, so we must not filter or flatten here.
  const value = ['p-1', false, { 'text-sm': true }]
  expect(normalizePt(value)).toEqual({ class: value })
})

it('normalizePt passes a props object through by reference', () => {
  const value = { class: 'p-1', title: 'tooltip' }
  expect(normalizePt(value)).toBe(value)
})

it('normalizePt does NOT treat a top-level object as class syntax', () => {
  // The contract that makes the shorthand safe: an object is always a props
  // object, never `{ [className]: boolean }` — the two are indistinguishable.
  // Removing this distinction would spread class names onto the DOM as attrs.
  expect(normalizePt({ 'text-sm': true })).toEqual({ 'text-sm': true })
})

it('normalizePt returns undefined for nullish', () => {
  expect(normalizePt(undefined)).toBeUndefined()
  expect(normalizePt(null)).toBeUndefined()
})

it('getPtValue normalizes the addressed slot only', () => {
  const pt = { img: 'rounded-full', input: { disabled: true } }
  expect(getPtValue(pt, 'img')).toEqual({ class: 'rounded-full' })
  expect(getPtValue(pt, 'input')).toEqual({ disabled: true })
})

it('getPtValue tolerates an absent pt map and an unset slot', () => {
  expect(getPtValue(undefined, 'img')).toBeUndefined()
  expect(getPtValue({} as { img?: string }, 'img')).toBeUndefined()
})

it('getPtValue rejects a key the pt map does not declare', () => {
  // Type-level assertion: fails the build if the `keyof` constraint is lost.
  // Kept on its own statement so the directive can only ever be satisfied by
  // the bad key, not by an unrelated error on the same line.
  const pt = { img: 'rounded-full' }
  // @ts-expect-error 'nope' is not a slot of this pt map
  const value = getPtValue(pt, 'nope')
  expect(value).toBeUndefined()
})
