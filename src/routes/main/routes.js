const express = require("express");
const router = express.Router();

// Import routes
const adminRoutes = require("../adminRoutes");
const userRoutes = require("../userRoutes");
const hadithRoutes = require("../hadithRoutes");
const hadithCategoryRoutes = require("../hadithCategoryRoutes");
const aiRoutes = require("../aiRoutes");
const chatHistoryRoutes = require("../chatHistoryRoutes");

// Routes
router.use(adminRoutes);
router.use(userRoutes);
router.use(hadithRoutes);
router.use(hadithCategoryRoutes);
router.use(aiRoutes);
router.use(chatHistoryRoutes);

module.exports = router;
