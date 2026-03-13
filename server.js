'use strict';

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/db');
const logger    = require('./utils/logger');
const leadRoutes   = require('./routes/leadRoutes');
const importRoutes = require('./routes/importRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const smtpRoutes = require('./routes/smtpRoutes');
const templateRoutes = require('./routes/templateRoutes');
const authRoutes = require('./routes/authRoutes');
const authMiddleware = require('./middleware/authMiddleware');
const smtpRotator = require('./utils/smtpRotator');
const templateEngine = require('./utils/templateEngine');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // Enable CORS for dashboard

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger with status code
app.use((req, res, next) => {
  res.on('finish', () => {
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode}`);
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/leads', authMiddleware, leadRoutes);
app.use('/api/smtp', authMiddleware, smtpRoutes);
app.use('/api/template', authMiddleware, templateRoutes);
app.use('/import-leads', authMiddleware, importRoutes);
app.use('/track', trackingRoutes);

// Health check
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', uptime: process.uptime() })
);

// 404
app.use((_req, res) =>
  res.status(404).json({ success: false, error: 'Route not found' })
);

// Global error handler
app.use((err, _req, res, _next) => {
  logger.error(`[server] ${err.message}`);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(async () => {
  await connectDB();
  await smtpRotator.refreshPool(); // Initialize SMTP transporters
  await templateEngine.refresh(); // Initialize email templates
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀  SERVER READY → http://localhost:${PORT}`);
    logger.info(`🚀  API running → http://localhost:${PORT}`);
    logger.info(`   Env   : ${process.env.NODE_ENV || 'development'}`);
  });
})();

module.exports = app;
