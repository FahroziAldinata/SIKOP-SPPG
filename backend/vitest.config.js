module.exports = {
  test: {
    globals: true,
    include: ['src/**/*.test.js'],
    environment: 'node',
    fileParallelism: false,
  },
};
