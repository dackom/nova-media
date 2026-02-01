import type { Request } from "express";
import type { Server } from "socket.io";

export type PatientEventType = "event:created" | "event:updated" | "event:deleted";

function emitToPatient(
  req: Request,
  patientId: string,
  eventType: PatientEventType
): void {
  const io = req.app.get("io") as Server | undefined;
  if (io) {
    io.to(`patient:${patientId}`).emit(eventType);
  }
}

export function emitEventCreatedToPatient(
  req: Request,
  patientId: string
): void {
  emitToPatient(req, patientId, "event:created");
}

export function emitEventUpdatedToPatient(
  req: Request,
  patientId: string
): void {
  emitToPatient(req, patientId, "event:updated");
}

export function emitEventDeletedToPatient(
  req: Request,
  patientId: string
): void {
  emitToPatient(req, patientId, "event:deleted");
}

export function emitEventReminderToPatient(
  io: Server,
  patientId: string,
  payload: { eventId: string; title?: string; utcStartDateTime: string }
): void {
  io.to(`patient:${patientId}`).emit("event:reminder", payload);
}
