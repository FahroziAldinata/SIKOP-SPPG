const { app, PORT } = require("./src/app");
const { logger } = require("./src/lib/logger");

app.listen(PORT, () => logger.info(`Server jalan di port ${PORT}`));

