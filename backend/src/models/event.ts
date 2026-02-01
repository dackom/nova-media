import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "Patient", required: true },
    utcStartDateTime: { type: Date, required: true },
    duration: { type: Number, default: 30 },
    title: { type: String },
    description: { type: String },
    reminderSentAt: { type: Date },
  },
  { timestamps: true }
);

export const Event = mongoose.model("Event", eventSchema);
