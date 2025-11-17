import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import antfu from '@antfu/eslint-config'
import pluginTailwindcss from 'eslint-plugin-tailwindcss'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default antfu(...pluginTailwindcss.configs['flat/recommended'], {
  // unocss: true,
  rules: {
    'tailwindcss/no-custom-classname': 'off',
    'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    'antfu/if-newline': 'off',
    'antfu/curly': 'off',
    'node/prefer-global/process': 'off',
    'style/brace-style': ['error', '1tbs'],
    'eslint-comments/no-unlimited-disable': 'off',
    'unicorn/prefer-number-properties': 'off',
    'unused-imports/no-unused-vars': 'warn',
  },
  settings: {
    tailwindcss: {
      config: `${__dirname}/app/assets/css/main.css`,
    },
  },
})
