module.exports = {
  extends: ['../../.eslintrc.cjs'],
  env: {
    browser: true,
    es2020: true,
  },
  plugins: ['react-hooks', 'react-refresh'],
  rules: {
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
  ignorePatterns: ['dist'],
}
