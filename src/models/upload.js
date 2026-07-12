/** @file Model to track uploaded media assets (S3/local keys) and their attachment status. */

import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    url: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    prefix: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "attached"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient off-peak cleanup queries
uploadSchema.index({ status: 1, createdAt: 1 });

export const Upload = mongoose.models.Upload || mongoose.model("Upload", uploadSchema);
