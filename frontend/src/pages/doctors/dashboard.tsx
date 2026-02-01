import { useState, useCallback } from "react";
import useSWR from "swr";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  getDay,
} from "date-fns";
import { enUS } from "date-fns/locale";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { EventSheet } from "@/components/event-sheet";
import { api } from "@/lib/api";
import { getBrowserTimezone, getTimeStringInTimezone } from "@/lib/timezone";
import type {
  ApiPatient,
  ApiEvent,
  CalendarEvent,
  EventsResponse,
  EventFormData,
} from "@/types";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = dateFnsLocalizer({
  format,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

function eventsFetcher(url: string): Promise<EventsResponse> {
  return api.get<EventsResponse>(url);
}

function patientsFetcher(path: string): Promise<{ patients: ApiPatient[] }> {
  return api.get<{ patients: ApiPatient[] }>(path);
}

function mapEventsToCalendar(
  events: ApiEvent[],
  doctorTimezone: string
): CalendarEvent[] {
  return events.map((e) => {
    const start = new Date(e.utcStartDateTime);
    const end = new Date(start.getTime() + (e.duration ?? 30) * 60000);
    const patientName =
      typeof e.patient === "object" ? e.patient.name : "Patient";
    const displayTitle = e.title?.trim() || patientName;
    const timeStr = getTimeStringInTimezone(start, doctorTimezone);
    return {
      id: e._id,
      title: `${timeStr} – ${displayTitle}`,
      start,
      end,
      resource: e,
    };
  });
}

export function DoctorsDashboard() {
  const { user, logout } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const now = new Date();
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState<Date>(() => now);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  });
  const doctorTimezone = getBrowserTimezone();

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
    let start: Date;
    let end: Date;
    switch (view) {
      case "week":
        start = startOfWeek(newDate, { locale: enUS });
        end = endOfWeek(newDate, { locale: enUS });
        break;
      case "day":
        start = startOfDay(newDate);
        end = endOfDay(newDate);
        break;
      case "agenda":
        start = startOfMonth(newDate);
        end = endOfMonth(new Date(newDate.getFullYear(), newDate.getMonth() + 1));
        break;
      default:
        start = startOfMonth(newDate);
        end = endOfMonth(newDate);
    }
    setDateRange({ start, end });
  }, [view]);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const eventsKey = `/doctors/events?start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}`;
  const { data: eventsData, mutate: mutateEvents } = useSWR(eventsKey, eventsFetcher);

  const { data: patientsData } = useSWR("/doctors/patients", patientsFetcher);

  const apiEvents = eventsData?.events ?? [];
  const events = apiEvents.length
    ? mapEventsToCalendar(apiEvents, doctorTimezone)
    : [];
  const patients = patientsData?.patients ?? [];

  function handleSelectSlot(slotInfo: { start: Date; end: Date }) {
    setSelectedDate(slotInfo.start);
    setSelectedEvent(null);
    setBatchMode(false);
    setSheetOpen(true);
  }

  function handleSelectEvent(event: CalendarEvent) {
    setSelectedEvent(event.resource ?? null);
    setSelectedDate(null);
    setBatchMode(false);
    setSheetOpen(true);
  }

  function handleAddBatchEvents() {
    setSelectedDate(null);
    setSelectedEvent(null);
    setBatchMode(true);
    setSheetOpen(true);
  }

  function handleRangeChange(
    range: Date[] | { start: Date; end: Date } | undefined
  ) {
    if (!range) return;
    const r = Array.isArray(range)
      ? { start: range[0], end: range[range.length - 1] }
      : range;
    setDateRange(r);
    // Do NOT set date here - range[0] can be from the previous month (to fill
    // the grid), which would overwrite the correct date from onNavigate
  }

  async function handleSave(data: EventFormData) {
    const body = data as unknown as Record<string, unknown>;
    if (selectedEvent) {
      await api.put(`/doctors/events/${selectedEvent._id}`, body);
    } else {
      await api.post("/doctors/events", body);
    }
    await mutateEvents();
  }

  async function handleDelete(eventId: string) {
    await api.delete(`/doctors/events/${eventId}`);
    await mutateEvents();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">Doctor Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground text-sm">
            {user?.name ?? "Doctor"}
          </span>
          <Button variant="outline" onClick={logout}>
            Log out
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 p-4">
        <div className="flex items-center justify-end mb-4">
          <Button onClick={handleAddBatchEvents}>Add Batch Events</Button>
        </div>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%", minHeight: 500 }}
          date={date}
          onNavigate={handleNavigate}
          view={view}
          onView={handleViewChange}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onRangeChange={handleRangeChange}
          selectable
          views={["month", "week"]}
        />
      </div>
      <EventSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        selectedDate={selectedDate}
        event={selectedEvent}
        existingEvents={apiEvents}
        onSave={handleSave}
        onDelete={handleDelete}
        patients={patients}
        doctorTimezone={doctorTimezone}
        batchMode={batchMode}
      />
    </div>
  );
}
