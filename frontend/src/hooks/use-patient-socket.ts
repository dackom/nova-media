import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { api } from "@/lib/api";
import { connectPatientSocket } from "@/lib/socket";

export interface EventReminderPayload {
  eventId: string;
  title?: string;
  utcStartDateTime: string;
}

export interface PatientSocketCallbacks {
  onEventCreated: () => void;
  onEventUpdated: () => void;
  onEventDeleted: () => void;
  onEventReminder?: (payload: EventReminderPayload) => void;
}

export function usePatientSocket(
  isPatient: boolean,
  callbacks: PatientSocketCallbacks
) {
  const socketRef = useRef<Socket | null>(null);
  const { onEventCreated, onEventUpdated, onEventDeleted, onEventReminder } =
    callbacks;

  useEffect(() => {
    if (!isPatient) return;

    let cancelled = false;
    const connect = async () => {
      try {
        const { token } = await api.get<{ token: string }>(
          "/patients/socket-token"
        );
        if (cancelled) return;
        const socket = await connectPatientSocket(token);
        if (cancelled) {
          socket.disconnect();
          return;
        }
        socketRef.current = socket;
        socket.on("event:created", onEventCreated);
        socket.on("event:updated", onEventUpdated);
        socket.on("event:deleted", onEventDeleted);
        if (onEventReminder) {
          socket.on("event:reminder", onEventReminder);
        }
      } catch {
        // Token fetch or connect failed – ignore (e.g. not logged in)
      }
    };
    connect();

    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.disconnect();
        socketRef.current = null;
      }
    };
  }, [isPatient, onEventCreated, onEventUpdated, onEventDeleted, onEventReminder]);
}
