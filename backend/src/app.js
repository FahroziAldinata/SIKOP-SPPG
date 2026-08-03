require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const aslapRoutes = require('./routes/aslap');
const mitraRoutes = require('./routes/mitra');
const giziRoutes = require('./routes/gizi');
const akuntanRoutes = require('./routes/akuntan');
const kepalaRoutes = require('./routes/kepala');
const laporanRoutes = require('./routes/laporan');
const notifikasiRoutes = require('./routes/notifikasi');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const laporanBugRoutes = require('./routes/laporanBug');
const pemeriksaanBahanRoutes = require('./routes/pemeriksaan-bahan');
const buktiLpd2mRoutes = require('./routes/bukti-lpd2m');

const { httpLogger } = require('./lib/logger');
const errorHandler = require('./middleware/errorHandler');
const swaggerUi = require('swagger-ui-express');
const { swaggerSpec } = require('./docs/openapi');
const { requireAuth, requireRole } = require('./middleware/auth');

const app = express();
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());
app.use(httpLogger);

app.use('/api/auth', authRoutes);
app.use('/api/aslap', aslapRoutes);
app.use('/api/mitra', mitraRoutes);
app.use('/api/gizi', giziRoutes);
app.use('/api/akuntan', akuntanRoutes);
app.use('/api/kepala', kepalaRoutes);
app.use('/api/laporan/lpd2m/bukti', buktiLpd2mRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/notifikasi', notifikasiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/laporan-bug', laporanBugRoutes);
app.use('/api/laporan/pemeriksaan-bahan', pemeriksaanBahanRoutes);

// Static serving untuk file upload (TTD, bukti, dll)
// app.js ada di backend/src, jadi ../uploads = backend/uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger API Documentation
const docsEnabled = process.env.NODE_ENV !== 'production' || process.env.ENABLE_DOCS === 'true';
if (docsEnabled) {
  const docsAuth = process.env.NODE_ENV === 'production'
    ? [requireAuth, requireRole('ADMIN')]
    : [];
  app.get('/api-docs.json', ...docsAuth, (req, res) => {
    res.json(JSON.parse(swaggerSpec));
  });
  app.use('/api-docs', ...docsAuth, swaggerUi.serve, swaggerUi.setup(JSON.parse(swaggerSpec)));
}

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

module.exports = { app, PORT };

