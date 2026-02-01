import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true },
    timezone: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Patient = mongoose.model("Patient", patientSchema);
