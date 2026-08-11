module.exports = {
  test: {
    globals: true,
    include: ['src/**/*.test.js'],
    environment: 'node',
    fileParallelism: false,
    setupFiles: ['./src/test/setup.js'],
    testTimeout: 20000,
    hookTimeout: 30000,
  },
};
