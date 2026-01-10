/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/test/**/*.test.js"],
  verbose: true,
  clearMocks: true,
  collectCoverageFrom: [
    "core/**/*.js",
    "parser/**/*.js",
    "!**/node_modules/**",
  ],
};
