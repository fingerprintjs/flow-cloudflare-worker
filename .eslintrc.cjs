module.exports = {
  extends: ['@fingerprintjs/eslint-config-dx-team'],
  // temporarily allow console in the worker
  overrides: [
    {
      files: ['src/scripts/**/*'],
      rules: {
        'no-console': 'error',
      },
    },
  ],
}
