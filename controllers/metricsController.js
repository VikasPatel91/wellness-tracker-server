const Metric = require("../models/Metric");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const path = require("path");
const fs = require("fs");

// Create or update metric entry
exports.createOrUpdateMetric = async (req, res, next) => {
  try {
    const { date, steps, sleep, mood, notes } = req.body;
    const userId = req.user._id;

    // Normalize date -> set to midnight (so only day matters)
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    // Find existing entry for same user + same day
    let metric = await Metric.findOne({ userId, date: dayStart });

    if (metric) {
      // Update existing entry
      metric.steps = steps !== undefined ? steps : metric.steps;
      metric.sleep = sleep !== undefined ? sleep : metric.sleep;
      metric.mood = mood || metric.mood;
      metric.notes = notes !== undefined ? notes : metric.notes;
    } else {
      // Create new entry
      metric = new Metric({
        userId,
        date: dayStart,
        steps,
        sleep,
        mood,
        notes,
      });
    }

    await metric.save();

    res.status(200).json({
      message: "Metric saved successfully",
      metric,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An entry already exists for this date",
      });
    }
    next(error);
  }
};

// Get metrics with optional date range filtering
exports.getMetrics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    let query = { userId };

    // Add date range filtering if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const metrics = await Metric.find(query).sort({ date: -1 });

    res.status(200).json({
      metrics,
      count: metrics.length,
    });
  } catch (error) {
    next(error);
  }
};

// Get single metric by ID
exports.getMetric = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const metric = await Metric.findOne({ _id: id, userId });

    if (!metric) {
      const error = new Error("Metric not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ metric });
  } catch (error) {
    next(error);
  }
};

// Update metric
exports.updateMetric = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { steps, sleep, mood, notes } = req.body;

    const metric = await Metric.findOne({ _id: id, userId });

    if (!metric) {
      const error = new Error("Metric not found");
      error.statusCode = 404;
      throw error;
    }

    // Update fields if provided
    if (steps !== undefined) metric.steps = steps;
    if (sleep !== undefined) metric.sleep = sleep;
    if (mood) metric.mood = mood;
    if (notes !== undefined) metric.notes = notes;

    await metric.save();

    res.status(200).json({
      message: "Metric updated successfully",
      metric,
    });
  } catch (error) {
    next(error);
  }
};

// Delete metric
exports.deleteMetric = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const metric = await Metric.findOne({ _id: id, userId });

    if (!metric) {
      const error = new Error("Metric not found");
      error.statusCode = 404;
      throw error;
    }

    await Metric.deleteOne({ _id: id, userId });

    res.status(200).json({ message: "Metric deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Get summary statistics
exports.getSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    let matchStage = { userId };

    // Add date range filtering if provided
    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const summary = await Metric.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          avgSteps: { $avg: "$steps" },
          avgSleep: { $avg: "$sleep" },
          moodCounts: {
            $push: "$mood",
          },
        },
      },
    ]);

    // Calculate mood distribution
    let moodDistribution = { Happy: 0, Neutral: 0, Tired: 0, Stressed: 0 };
    if (summary.length > 0 && summary[0].moodCounts) {
      summary[0].moodCounts.forEach((mood) => {
        if (moodDistribution.hasOwnProperty(mood)) {
          moodDistribution[mood]++;
        }
      });
    }

    // Find most common mood
    let mostCommonMood = "Neutral";
    let maxCount = 0;
    for (const [mood, count] of Object.entries(moodDistribution)) {
      if (count > maxCount) {
        mostCommonMood = mood;
        maxCount = count;
      }
    }

    const result =
      summary.length > 0
        ? {
            totalEntries: summary[0].totalEntries || 0,
            avgSteps: Math.round(summary[0].avgSteps || 0),
            avgSleep: (summary[0].avgSleep || 0).toFixed(1),
            moodDistribution,
            mostCommonMood,
          }
        : {
            totalEntries: 0,
            avgSteps: 0,
            avgSleep: 0,
            moodDistribution,
            mostCommonMood,
          };

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Export data to CSV
exports.exportData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    let query = { userId };

    // Add date range filtering if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const metrics = await Metric.find(query).sort({ date: 1 });

    if (metrics.length === 0) {
      const error = new Error("No data to export");
      error.statusCode = 404;
      throw error;
    }

    // Prepare CSV data
    const csvData = metrics.map((metric) => ({
      date: metric.date.toISOString().split("T")[0],
      steps: metric.steps,
      sleep: metric.sleep,
      mood: metric.mood,
      notes: metric.notes || "",
    }));

    // Define CSV writer
    const csvWriter = createCsvWriter({
      path: "wellness-data.csv",
      header: [
        { id: "date", title: "Date" },
        { id: "steps", title: "Steps" },
        { id: "sleep", title: "Sleep Hours" },
        { id: "mood", title: "Mood" },
        { id: "notes", title: "Notes" },
      ],
    });

    // Write CSV file
    await csvWriter.writeRecords(csvData);

    // Send file
    res.download("wellness-data.csv", "wellness-data.csv", (err) => {
      if (err) {
        console.error("Error downloading file:", err);
      }
      // Delete temporary file
      fs.unlinkSync("wellness-data.csv");
    });
  } catch (error) {
    next(error);
  }
};

// AI-powered mood summary (mock implementation)
exports.getMoodSummary = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    let matchStage = { userId };

    // Add date range filtering if provided
    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const metrics = await Metric.find(matchStage).sort({ date: 1 });

    if (metrics.length === 0) {
      const error = new Error("No data available for summary");
      error.statusCode = 404;
      throw error;
    }

    // Simple algorithm to generate a mood summary
    const moodCounts = { Happy: 0, Neutral: 0, Tired: 0, Stressed: 0 };
    metrics.forEach((metric) => {
      moodCounts[metric.mood]++;
    });

    const total = metrics.length;
    const happyPct = (moodCounts.Happy / total) * 100;
    const stressedPct = (moodCounts.Stressed / total) * 100;

    let summary = "";

    if (happyPct > 50) {
      summary =
        "You've been in a positive mood most of the time. Keep up whatever is making you happy!";
    } else if (stressedPct > 40) {
      summary =
        "You've experienced significant stress recently. Consider practicing relaxation techniques or adjusting your routine.";
    } else if (moodCounts.Tired > moodCounts.Happy) {
      summary =
        "You've been feeling tired more often. Make sure you're getting enough quality sleep and managing your energy levels.";
    } else {
      summary =
        "Your mood has been fairly balanced. You're maintaining a good equilibrium in your daily life.";
    }

    // Add some wellness tips based on the data
    const avgSleep =
      metrics.reduce((sum, metric) => sum + metric.sleep, 0) / total;
    const avgSteps =
      metrics.reduce((sum, metric) => sum + metric.steps, 0) / total;

    if (avgSleep < 7) {
      summary +=
        " Based on your sleep patterns, you might benefit from aiming for 7-9 hours of sleep per night.";
    }

    if (avgSteps < 5000) {
      summary +=
        " Increasing your daily steps could help boost your energy and mood.";
    }

    res.status(200).json({ summary });
  } catch (error) {
    next(error);
  }
};
