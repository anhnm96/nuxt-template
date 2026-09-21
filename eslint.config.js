import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import antfu from '@antfu/eslint-config'
import pluginTailwindcss from 'eslint-plugin-tailwindcss'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default antfu({
  rules: {
    'antfu/curly': 'off',
    'antfu/if-newline': 'off',
    'eslint-comments/no-unlimited-disable': 'off',
    'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    'node/prefer-global/process': 'off',
    'style/brace-style': ['error', '1tbs'],
    'ts/consistent-type-definitions': 'off',
    'unicorn/prefer-number-properties': 'off',
    'unused-imports/no-unused-vars': 'warn',
    'vitest/prefer-lowercase-title': 'off',
  },
}, pluginTailwindcss.configs.recommended, {
  settings: {
    tailwindcss: {
      cssConfigPath: `${__dirname}/app/assets/css/main.css`,
    },
  },
  rules: {
    'tailwindcss/no-custom-classname': 'off',
    'tailwindcss/enforces-canonical-classname': 'off',
    'tailwindcss/no-unnecessary-arbitrary-value': 'off',
  },
})
