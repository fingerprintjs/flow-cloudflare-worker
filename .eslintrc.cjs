module.exports = {
  extends: ['@fingerprintjs/eslint-config-dx-team'],
  overrides: [
    // prevent console usage in instrumentation scripts
    {
      files: ['src/scripts/**/*'],
      rules: {
        'no-console': 'error',
      },
    },
  ],
}
