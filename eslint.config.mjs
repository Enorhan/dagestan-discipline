import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'ios/**',
      'tmp/**',
      'supabase/functions/**',
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/purity': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/set-state-in-effect': 'error',
      'react/no-unescaped-entities': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx,mjs}'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['src/lib/logger.ts', 'src/lib/monitoring.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]

export default config
