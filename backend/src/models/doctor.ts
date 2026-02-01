import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

export const Doctor = mongoose.model("Doctor", doctorSchema);
