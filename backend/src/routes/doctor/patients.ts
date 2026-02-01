import { Router, Request, Response } from "express";
import { Patient } from "../../models/patient.js";
import { getCachedPatients, setCachedPatients } from "../../lib/patients-cache.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const cached = await getCachedPatients();
  if (cached) {
    return res.json(cached);
  }

  const patients = await Patient.find().select("name email timezone");
  const response = {
    patients: patients.map((p) => ({
      _id: p._id,
      name: p.name,
      email: p.email,
      timezone: p.timezone ?? "",
    })),
  };

  await setCachedPatients(response);

  return res.json(response);
});

export default router;
