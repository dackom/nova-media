import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { Event } from "../../models/event.js";
import { Patient } from "../../models/patient.js";
import {
  emitEventCreatedToPatient,
  emitEventDeletedToPatient,
  emitEventUpdatedToPatient,
} from "../../lib/emit-to-patient.js";
import {
  getCachedEvents,
  setCachedEvents,
  invalidateDoctorEventsCache,
} from "../../lib/events-cache.js";

const router = Router();

type ReqWithDoctor = Request & { doctorId: string };

function mapEvent(e: {
  _id: unknown;
  doctor: unknown;
  patient: unknown;
  utcStartDateTime: Date;
  duration: number;
  title?: string | null;
  description?: string | null;
}) {
  return {
    _id: e._id,
    doctor: e.doctor,
    patient: e.patient,
    utcStartDateTime: e.utcStartDateTime,
    duration: e.duration,
    title: e.title,
    description: e.description,
  };
}

router.get("/", async (req: Request, res: Response) => {
  const doctorId = (req as ReqWithDoctor).doctorId;
  const start = req.query.start as string | undefined;
  const end = req.query.end as string | undefined;

  if (start && end) {
    const cached = await getCachedEvents(doctorId, start, end);
    if (cached) {
      return res.json(cached);
    }
  }

  const filter: Record<string, unknown> = { doctor: doctorId };

  if (start && end) {
    filter.utcStartDateTime = {
      $gte: new Date(start),
      $lte: new Date(end),
    };
  }

  const events = await Event.find(filter).populate("patient", "name timezone");
  const response = {
    events: events.map((e) => mapEvent(e)),
  };

  if (start && end) {
    await setCachedEvents(doctorId, start, end, response);
  }

  return res.json(response);
});

router.get("/:id", async (req: Request, res: Response) => {
  const doctorId = (req as ReqWithDoctor).doctorId;
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event ID" });
  }

  const event = await Event.findOne({ _id: id, doctor: doctorId }).populate(
    "patient",
    "name email timezone"
  );

  if (!event) {
    return res.status(404).json({ success: false, message: "Event not found" });
  }

  return res.json({
    event: {
      _id: event._id,
      doctor: event.doctor,
      patient: event.patient,
      utcStartDateTime: event.utcStartDateTime,
      duration: event.duration,
      title: event.title,
      description: event.description,
    },
  });
});

function getDatesInRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);
  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

router.post("/", async (req: Request, res: Response) => {
  const doctorId = (req as ReqWithDoctor).doctorId;
  const {
    patient,
    utcStartDateTime,
    utcStartDateRange,
    duration,
    title,
    description,
  } = req.body as {
    patient?: string;
    utcStartDateTime?: string;
    utcStartDateRange?: { start: string; end: string };
    duration?: number;
    title?: string;
    description?: string;
  };

  if (!patient) {
    return res.status(400).json({
      success: false,
      message: "Patient is required",
    });
  }

  const hasRange = utcStartDateRange?.start && utcStartDateRange?.end;
  const hasSingle = !!utcStartDateTime;

  if (!hasRange && !hasSingle) {
    return res.status(400).json({
      success: false,
      message:
        "Either utcStartDateTime or utcStartDateRange (start and end) is required",
    });
  }

  if (hasRange && hasSingle) {
    return res.status(400).json({
      success: false,
      message:
        "Provide either utcStartDateTime or utcStartDateRange, not both",
    });
  }

  if (!mongoose.isValidObjectId(patient)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid patient ID" });
  }

  const patientExists = await Patient.findById(patient);
  if (!patientExists) {
    return res
      .status(400)
      .json({ success: false, message: "Patient not found" });
  }

  const dur = typeof duration === "number" ? duration : 30;
  const titleVal = title?.trim() || undefined;
  const descVal = description ?? undefined;

  if (hasRange) {
    const rangeStart = new Date(utcStartDateRange!.start);
    const rangeEnd = new Date(utcStartDateRange!.end);
    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid utcStartDateRange start or end",
      });
    }
    if (rangeStart > rangeEnd) {
      return res.status(400).json({
        success: false,
        message: "Range start must be before or equal to end",
      });
    }

    const hour = rangeStart.getUTCHours();
    const min = rangeStart.getUTCMinutes();
    const sec = rangeStart.getUTCSeconds();
    const ms = rangeStart.getUTCMilliseconds();

    const dates = getDatesInRange(rangeStart, rangeEnd);
    const events = await Event.insertMany(
      dates.map((d) => {
        const utcStart = new Date(d);
        utcStart.setUTCHours(hour, min, sec, ms);
        return {
          doctor: doctorId,
          patient,
          utcStartDateTime: utcStart,
          duration: dur,
          title: titleVal,
          description: descVal,
        };
      })
    );

    const populated = await Event.find({ _id: { $in: events.map((e) => e._id) } })
      .populate("patient", "name timezone")
      .sort({ utcStartDateTime: 1 });

    await invalidateDoctorEventsCache(doctorId);
    emitEventCreatedToPatient(req, patient);

    return res.status(201).json({
      events: populated.map((e) => mapEvent(e)),
    });
  }

  const startDate = new Date(utcStartDateTime!);
  if (isNaN(startDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Invalid utcStartDateTime",
    });
  }

  const event = await Event.create({
    doctor: doctorId,
    patient,
    utcStartDateTime: startDate,
    duration: dur,
    title: titleVal,
    description: descVal,
  });

  const populated = await Event.findById(event._id).populate(
    "patient",
    "name timezone"
  );

  await invalidateDoctorEventsCache(doctorId);
  emitEventCreatedToPatient(req, patient);

  return res.status(201).json({
    event: mapEvent(populated!),
  });
});

router.put("/:id", async (req: Request, res: Response) => {
  const doctorId = (req as ReqWithDoctor).doctorId;
  const { id } = req.params;
  const { patient, utcStartDateTime, duration, title, description } = req.body as {
    patient?: string;
    utcStartDateTime?: string;
    duration?: number;
    title?: string;
    description?: string;
  };

  if (!mongoose.isValidObjectId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event ID" });
  }

  const existing = await Event.findOne({ _id: id, doctor: doctorId });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Event not found" });
  }

  if (patient !== undefined) {
    if (!mongoose.isValidObjectId(patient)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid patient ID" });
    }
    const patientExists = await Patient.findById(patient);
    if (!patientExists) {
      return res
        .status(400)
        .json({ success: false, message: "Patient not found" });
    }
  }

  const updates: Record<string, unknown> = {};
  if (patient !== undefined) updates.patient = patient;
  if (utcStartDateTime !== undefined) {
    const startDate = new Date(utcStartDateTime);
    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid utcStartDateTime",
      });
    }
    updates.utcStartDateTime = startDate;
  }
  if (duration !== undefined) updates.duration = duration;
  if ("title" in req.body)
    updates.title =
      typeof req.body.title === "string" ? req.body.title.trim() : "";
  if (description !== undefined) updates.description = description;

  const event = await Event.findByIdAndUpdate(id, updates, {
    new: true,
  }).populate("patient", "name timezone");

  const oldPatientId = String(existing.patient);
  const newPatientId =
    patient !== undefined ? String(patient) : oldPatientId;
  await invalidateDoctorEventsCache(doctorId);
  emitEventUpdatedToPatient(req, newPatientId);
  if (oldPatientId !== newPatientId) {
    emitEventDeletedToPatient(req, oldPatientId);
  }

  return res.json({
    event: mapEvent(event!),
  });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const doctorId = (req as ReqWithDoctor).doctorId;
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid event ID" });
  }

  const result = await Event.findOneAndDelete({ _id: id, doctor: doctorId });

  if (result) {
    await invalidateDoctorEventsCache(doctorId);
    emitEventDeletedToPatient(req, String(result.patient));
  }

  if (!result) {
    return res.status(404).json({ success: false, message: "Event not found" });
  }

  return res.json({ success: true, message: "Event deleted" });
});

export default router;
