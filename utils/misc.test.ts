import { faker } from '@faker-js/faker'
import { getErrorMessage } from './misc'
import { consoleError } from '~/tests/setup-vitest'

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
