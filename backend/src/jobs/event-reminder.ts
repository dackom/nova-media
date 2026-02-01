import type { Server } from "socket.io";
import { Event } from "../models/event.js";
import { emitEventReminderToPatient } from "../lib/emit-to-patient.js";

const FIVE_MIN_MS = 5 * 60 * 1000;
const SIX_MIN_MS = 6 * 60 * 1000;

export function startEventReminderJob(io: Server): void {
  setInterval(async () => {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() + FIVE_MIN_MS);
      const windowEnd = new Date(now.getTime() + SIX_MIN_MS);

      const events = await Event.find({
        utcStartDateTime: { $gte: windowStart, $lt: windowEnd },
        reminderSentAt: null,
      });

      for (const event of events) {
        const patientId = String(event.patient);
        emitEventReminderToPatient(io, patientId, {
          eventId: String(event._id),
          title: event.title ?? undefined,
          utcStartDateTime: event.utcStartDateTime.toISOString(),
        });
        await Event.updateOne(
          { _id: event._id },
          { reminderSentAt: new Date() }
        );
        console.log("Event reminder sent to patient:", patientId);
      }
    } catch (err) {
      console.error("Event reminder job error:", err);
    }
  }, 60_000);
}
