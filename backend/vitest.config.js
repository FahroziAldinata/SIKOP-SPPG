module.exports = {
  test: {
    globals: true,
    include: ['src/**/*.test.js'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
};
