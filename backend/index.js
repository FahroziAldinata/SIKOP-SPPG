const { app, PORT } = require('./src/app');
const { logger } = require('./src/lib/logger');
const { loadPermissionCache } = require('./src/middleware/auth');

loadPermissionCache()
  .then(() => {
    logger.info('Permission cache loaded successfully');
  })
  .catch((err) => {
    logger.error(err, 'Gagal memuat permission cache saat server boot');
  });

app.listen(PORT, () => logger.info(`Server jalan di port ${PORT}`));
