import { expect, test } from '@nuxt/test-utils/playwright'

test('home ui', async ({ page, goto }) => {
  await goto('/', { waitUntil: 'hydration' })
  await expect(page).toHaveTitle('Epic Stack')
  await expect(page.getByRole('heading')).toHaveText('The Epic Stack')
})
