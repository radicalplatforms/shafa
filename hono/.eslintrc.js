module.exports = {
  root: true,
  extends: ['@hono/eslint-config', 'plugin:drizzle/all', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['drizzle'],
}
