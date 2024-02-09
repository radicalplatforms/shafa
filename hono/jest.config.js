module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'miniflare',
  testEnvironmentOptions: {
    bindings: { KEY: 'value' },
    kvNamespaces: ['TEST_NAMESPACE'],
  },
}
