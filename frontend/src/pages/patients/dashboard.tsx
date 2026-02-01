import { useCallback } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import {
  usePatientSocket,
  type EventReminderPayload,
} from "@/hooks/use-patient-socket";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import { getBrowserTimezone } from "@/lib/timezone";
import type { ApiEvent, EventsResponse } from "@/types";

function eventsFetcher(path: string): Promise<EventsResponse> {
  return api.get<EventsResponse>(path);
}

function formatEventDateTime(utcStart: string, duration: number): string {
  const start = new Date(utcStart);
  const end = new Date(start.getTime() + duration * 60000);
  const tz = getBrowserTimezone() || "UTC";
  const startStr = start.toLocaleString(undefined, { timeZone: tz });
  const endStr = end.toLocaleTimeString(undefined, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startStr} – ${endStr}`;
}

function EventCard({ event }: { event: ApiEvent }) {
  const doctorName =
    typeof event.doctor === "object" ? event.doctor?.name : "Doctor";
  const displayTitle = event.title?.trim() || "Appointment";
  const dateTimeStr = formatEventDateTime(
    event.utcStartDateTime,
    event.duration ?? 30
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{displayTitle}</CardTitle>
        <CardDescription>
          {doctorName} • {dateTimeStr}
        </CardDescription>
      </CardHeader>
      {event.description && (
        <CardContent className="pt-0">
          <p className="text-muted-foreground text-sm">{event.description}</p>
        </CardContent>
      )}
    </Card>
  );
}

export function PatientsDashboard() {
  const { user, logout } = useAuth();
  const { data: eventsData, error, isLoading, mutate } = useSWR(
    "/patients/events",
    eventsFetcher
  );
  const events = eventsData?.events ?? [];

  const handleEventCreated = useCallback(() => {
    toast.success("New event is added");
    mutate();
  }, [mutate]);

  const handleEventUpdated = useCallback(() => {
    toast.success("Event has been updated");
    mutate();
  }, [mutate]);

  const handleEventDeleted = useCallback(() => {
    toast.success("Event has been removed");
    mutate();
  }, [mutate]);

  const handleEventReminder = useCallback((payload: EventReminderPayload) => {
    const message = payload.title?.trim()
      ? `Appointment in 5 minutes: ${payload.title}`
      : "Appointment in 5 minutes";
    toast.info(message);
  }, []);

  usePatientSocket(user?.type === "patient", {
    onEventCreated: handleEventCreated,
    onEventUpdated: handleEventUpdated,
    onEventDeleted: handleEventDeleted,
    onEventReminder: handleEventReminder,
  });

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Patient Dashboard</h1>
          <Button variant="outline" onClick={logout}>
            Log out
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user?.name ?? "Patient"}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Your upcoming appointments and events.
            </p>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Your Appointments</h2>
          {isLoading && (
            <p className="text-muted-foreground text-sm">Loading…</p>
          )}
          {error && (
            <p className="text-destructive text-sm">
              Failed to load appointments. Please try again.
            </p>
          )}
          {!isLoading && !error && events.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No appointments scheduled.
            </p>
          )}
          {!isLoading && !error && events.length > 0 && (
            <div className="flex flex-col gap-3">
              {events.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
