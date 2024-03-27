module.exports = {
  plugins: ['prettier'],
  extends: ['eslint:recommended', 'plugin:prettier/recommended', 'eslint-config-prettier'],
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module',
  },
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  rules: {
    'prettier/prettier': 'error',
  },
}
