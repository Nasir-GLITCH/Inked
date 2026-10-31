const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  globalIgnores(['dist/*', 'coverage/*', '.expo/*', 'node_modules/*', 'supabase/functions/*']),
  expoConfig,
  prettierConfig,
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
]);
