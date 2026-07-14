const express = require('express');
const corsMiddleware = require('../middlewares/cors');

// Routes
const authRoutes = require('./auth');
const auditLogsRoutes = require('./auditLogs');
const usersRoutes = require('./users');
const dashboardRoutes = require('./dashboard');
const financeRoutes = require('./finance');
const patientsRoutes = require('./patients');
const medicalRecordsRoutes = require('./medicalRecords');
const examinationRoutes = require('./examination');
const transactionsRoutes = require('./transactions');
const medicinesRoutes = require('./medicines');
const cacheRoutes = require('./cache');
const settingsRoutes = require('./settingsRoutes');

const router = express.Router();

// Apply CORS middleware
router.use(corsMiddleware);

// Apply JSON parser
router.use(express.json());

// Mount routes
router.use(authRoutes);
router.use(auditLogsRoutes);
router.use(usersRoutes);
router.use(dashboardRoutes);
router.use(financeRoutes);
router.use(patientsRoutes);
router.use(medicalRecordsRoutes);
router.use(examinationRoutes);
router.use(transactionsRoutes);
router.use(medicinesRoutes);
router.use(cacheRoutes);
router.use('/api/settings', settingsRoutes);

module.exports = router;
