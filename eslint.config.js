module.exports = [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', 'docs/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
