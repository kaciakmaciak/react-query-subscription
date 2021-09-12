/* eslint-disable */
module.exports = {
  rootDir: 'src',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  collectCoverageFrom: ['**/*.{js,jsx,ts,tsx}'],
  coverageDirectory: '<rootDir>/../coverage',
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.js'],
  testEnvironment: 'jsdom',
  testTimeout: 15000,
};
