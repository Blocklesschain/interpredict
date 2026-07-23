import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // Permanent IPFS/Arweave URLs and wallet-provided previews cannot be
      // enumerated in Next's static image configuration.
      '@next/next/no-img-element': 'off',
      // Legacy public copy still contains apostrophes that are safe as JSX text.
      'react/no-unescaped-entities': 'warn',
      // Existing authentication adapters receive provider-specific payloads.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  globalIgnores([
    '.next/**',
    'interpredict-deploy/artifacts/**',
    'interpredict-deploy/cache/**',
    'interpredict-deploy/node_modules/**',
    'interpredict-deploy/types/**',
    'node_modules/**',
    'tsconfig.tsbuildinfo',
  ]),
])
