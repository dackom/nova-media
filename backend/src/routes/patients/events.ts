import { Router, Request, Response } from "express";
import { Event } from "../../models/event.js";

const router = Router();

type ReqWithPatient = Request & { patientId: string };

router.get("/", async (req: Request, res: Response) => {
  const patientId = (req as ReqWithPatient).patientId;

  const events = await Event.find({ patient: patientId })
    .populate("doctor", "name")
    .sort({ utcStartDateTime: 1 });

  return res.json({
    events: events.map((e) => ({
      _id: e._id,
      doctor: e.doctor,
      patient: e.patient,
      utcStartDateTime: e.utcStartDateTime,
      duration: e.duration,
      title: e.title,
      description: e.description,
    })),
  });
});

export default router;
