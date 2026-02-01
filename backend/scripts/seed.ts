import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { Doctor } from "../src/models/doctor.js";
import { Patient } from "../src/models/patient.js";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/nova-media";

const SEED_PASSWORD = "123";

const DOCTORS = [
  { name: "Dr. Sarah Chen", email: "sarah.chen@nova-medicine.com" },
  { name: "Dr. Marcus Webb", email: "marcus.webb@nova-medicine.com" },
];

const PATIENTS = [
  { name: "Emma Johnson", email: "emma.johnson@email.com" },
  { name: "James Wilson", email: "james.wilson@email.com" },
  { name: "Olivia Martinez", email: "olivia.martinez@email.com" },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

  await Doctor.deleteMany({});
  await Patient.deleteMany({});

  await Doctor.insertMany(
    DOCTORS.map((d) => ({ ...d, password: hashedPassword }))
  );
  console.log("Inserted 2 doctors");

  await Patient.insertMany(
    PATIENTS.map((p) => ({ ...p, password: hashedPassword }))
  );
  console.log("Inserted 3 patients");

  console.log("Seed complete.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
