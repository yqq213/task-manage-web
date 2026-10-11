/** Jest 使用 CommonJS 配置，避免与应用的 ESM 和 Vite 构建互相影响。 */
module.exports = {
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { customExportConditions: ['node', 'node-addons'] },
  roots: ['<rootDir>/tests/unit'],
  testMatch: ['**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'vue'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tests/tsconfig.json' }]
  },
  globals: { 'vue-jest': { tsConfig: require('node:path').join(__dirname, 'tests/tsconfig.json') } },
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.ts'],
  clearMocks: true,
  coverageDirectory: '<rootDir>/tests/unit/coverage',
  collectCoverageFrom: ['src/views/task/list/index.vue']
}
