import { Router, Request, Response } from "express";
import { createSocketToken } from "../../lib/socket-tokens.js";

const router = Router();

type ReqWithPatient = Request & { patientId: string };

router.get("/", (req: Request, res: Response) => {
  const patientId = (req as ReqWithPatient).patientId;
  const token = createSocketToken(patientId);
  return res.json({ token });
});

export default router;
