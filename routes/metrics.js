const express = require("express");
const router = express.Router();
const metricsController = require("../controllers/metricsController");
const auth = require("../middleware/auth");
const { validateMetric } = require("../middleware/validation");

// All routes require authentication
router.use(auth);

// Create or update metric entry
router.post("/", validateMetric, metricsController.createOrUpdateMetric);

// Get all metrics with optional date filtering
router.get("/", metricsController.getMetrics);

// Get metric summary
router.get("/summary", metricsController.getSummary);

// Get single metric
router.get("/:id", metricsController.getMetric);

// Update metric
router.put("/:id", validateMetric, metricsController.updateMetric);

// Delete metric
router.delete("/:id", metricsController.deleteMetric);

// Export data to CSV
router.get("/export/csv", metricsController.exportData);

// Get AI mood summary
router.get("/ai/summary", metricsController.getMoodSummary);

module.exports = router;
