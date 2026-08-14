'use strict';
// Load .env untuk ALL file test, independen dari require app.js (fix GF-014 T1 race DATABASE_URL)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });
process.env.NODE_ENV = 'test';