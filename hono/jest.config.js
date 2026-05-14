module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: './test/utils/global-setup.ts',
  globalTeardown: './test/utils/global-teardown.ts',
  setupFiles: ['./test/utils/setup-env.ts'],
  moduleNameMapper: {
    '^@hono/clerk-auth$': '<rootDir>/test/utils/clerk-auth.mock.ts',
  },
}
