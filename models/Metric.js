const mongoose = require("mongoose");

const metricSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    steps: {
      type: Number,
      min: 0,
      default: 0,
    },
    sleep: {
      type: Number,
      min: 0,
      max: 24,
      default: 0,
    },
    mood: {
      type: String,
      enum: ["Happy", "Neutral", "Tired", "Stressed"],
      default: "Neutral",
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Compound index ensures uniqueness per user per day
metricSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Metric", metricSchema);
