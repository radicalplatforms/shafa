module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: './test/utils/global-setup.ts',
  globalTeardown: './test/utils/global-teardown.ts',
}
