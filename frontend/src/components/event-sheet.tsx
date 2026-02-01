import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getTimeStringInTimezone,
  localToUTCString,
  formatTimeInTimezone,
} from "@/lib/timezone";
import { format } from "date-fns";
import { useMemo } from "react";
import type { ApiPatient, ApiEvent, EventFormData } from "@/types";
import type { DateRange } from "react-day-picker";

interface EventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  event: ApiEvent | null;
  existingEvents: ApiEvent[];
  onSave: (data: EventFormData) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  patients: ApiPatient[];
  doctorTimezone: string;
  batchMode?: boolean;
}

function eventsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime();
}

export function EventSheet({
  open,
  onOpenChange,
  selectedDate,
  event,
  existingEvents,
  onSave,
  onDelete,
  patients,
  doctorTimezone,
  batchMode = false,
}: EventSheetProps) {
  const isEdit = !!event;

  const [patientId, setPatientId] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("30");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      if (batchMode) {
        setPatientId("");
        setTime("09:00");
        setDuration("30");
        setTitle("");
        setDescription("");
        const today = new Date();
        setDateRange({ from: today, to: today });
        setDate(null);
      } else if (isEdit && event) {
        const utcStart = new Date(event.utcStartDateTime);
        const pid =
          typeof event.patient === "object" ? event.patient._id : event.patient;
        setPatientId(pid);
        setTime(getTimeStringInTimezone(utcStart, doctorTimezone));
        setDuration(String(event.duration ?? 30));
        setTitle(event.title ?? "");
        setDescription(event.description ?? "");
        setDate(utcStart);
        setDateRange(undefined);
      } else if (selectedDate) {
        setPatientId("");
        setTime(
          getTimeStringInTimezone(selectedDate, doctorTimezone) || "09:00"
        );
        setDuration("30");
        setTitle("");
        setDescription("");
        setDate(selectedDate);
        setDateRange(undefined);
      } else {
        setDate(null);
        setDateRange(undefined);
      }
    }
  }, [open, isEdit, event, selectedDate, doctorTimezone, batchMode]);

  const selectedPatient = patients.find((p) => p._id === patientId);
  const eventPatientTz =
    isEdit && event && typeof event.patient === "object" && event.patient?.timezone
      ? event.patient.timezone
      : "";
  const patientTimezone = selectedPatient?.timezone ?? eventPatientTz ?? "";

  const overlaps = useMemo(() => {
    if (batchMode) return false;
    if (!date) return false;
    const [hourStr, minStr] = time.split(":");
    const hour = parseInt(hourStr || "0", 10);
    const min = parseInt(minStr || "0", 10);
    const dur = parseInt(duration || "30", 10) || 30;
    const utcStartStr = localToUTCString(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour,
      min
    );
    const proposedStart = new Date(utcStartStr);
    const proposedEnd = new Date(proposedStart.getTime() + dur * 60000);

    return existingEvents.some((e) => {
      if (isEdit && event && e._id === event._id) return false;
      const otherStart = new Date(e.utcStartDateTime);
      const otherEnd = new Date(otherStart.getTime() + (e.duration ?? 30) * 60000);
      return eventsOverlap(proposedStart, proposedEnd, otherStart, otherEnd);
    });
  }, [batchMode, date, time, duration, existingEvents, isEdit, event]);

  const displayDateForTz = batchMode ? dateRange?.from : date;
  let patientTimeDisplay = "";
  if (patientId && patientTimezone && displayDateForTz) {
    const [hourStr, minStr] = time.split(":");
    const hour = parseInt(hourStr || "0", 10);
    const min = parseInt(minStr || "0", 10);
    const utcStr = localToUTCString(
      displayDateForTz.getFullYear(),
      displayDateForTz.getMonth(),
      displayDateForTz.getDate(),
      hour,
      min
    );
    const utcDate = new Date(utcStr);
    patientTimeDisplay = formatTimeInTimezone(utcDate, patientTimezone);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!patientId) {
      setError("Please select a patient");
      return;
    }
    const [hourStr, minStr] = time.split(":");
    const hour = parseInt(hourStr || "0", 10);
    const min = parseInt(minStr || "0", 10);
    const dur = parseInt(duration || "30", 10) || 30;

    if (batchMode) {
      if (!dateRange?.from || !dateRange?.to) {
        setError("Please select a date range");
        return;
      }
      if (dateRange.from > dateRange.to) {
        setError("Start date must be before or equal to end date");
        return;
      }
      const utcStartStr = localToUTCString(
        dateRange.from.getFullYear(),
        dateRange.from.getMonth(),
        dateRange.from.getDate(),
        hour,
        min
      );
      const utcEndStr = localToUTCString(
        dateRange.to.getFullYear(),
        dateRange.to.getMonth(),
        dateRange.to.getDate(),
        hour,
        min
      );
      setIsSaving(true);
      try {
        await onSave({
          patient: patientId,
          utcStartDateRange: { start: utcStartStr, end: utcEndStr },
          duration: dur,
          title: title.trim(),
          description: description.trim() || undefined,
        });
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setIsSaving(false);
      }
    } else {
      if (!date) {
        setError("Date is required");
        return;
      }
      const utcStartDateTime = localToUTCString(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        hour,
        min
      );
      setIsSaving(true);
      try {
        await onSave({
          patient: patientId,
          utcStartDateTime,
          duration: dur,
          title: title.trim(),
          description: description.trim() || undefined,
        });
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save");
      } finally {
        setIsSaving(false);
      }
    }
  }

  async function handleDelete() {
    if (!event) return;
    try {
      await onDelete(event._id);
      setDeleteDialogOpen(false);
      onOpenChange(false);
    } catch {
      setError("Failed to delete");
    }
  }

  const displayDate = date ? format(date, "PPP") : "";
  const displayDateRange =
    dateRange?.from && dateRange?.to
      ? dateRange.from.getTime() === dateRange.to.getTime()
        ? format(dateRange.from, "PPP")
        : `${format(dateRange.from, "PPP")} – ${format(dateRange.to, "PPP")}`
      : "Select date range";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {batchMode
                ? "Add Batch Events"
                : isEdit
                  ? "Edit Event"
                  : "New Event"}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col gap-4 overflow-auto px-4">
              {error && (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              {overlaps && (
                <div className="rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                  This event overlaps with another event on the same day. Please
                  choose a different time or duration.
                </div>
              )}
              <FieldGroup>
                <Field>
                  <FieldLabel>Patient</FieldLabel>
                  <Select
                    value={patientId}
                    onValueChange={setPatientId}
                    required
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>Date{batchMode ? " range" : ""}</FieldLabel>
                  {batchMode ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          {displayDateRange}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={2}
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {displayDate}
                    </div>
                  )}
                </Field>
                <Field>
                  <FieldLabel>Time</FieldLabel>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                  {patientTimeDisplay && (
                    <p className="text-muted-foreground mt-1 text-sm">
                      For patient: {patientTimeDisplay} in their timezone
                    </p>
                  )}
                </Field>
                <Field>
                  <FieldLabel>Duration (minutes)</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel>Title</FieldLabel>
                  <Input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Optional title for the event"
                  />
                </Field>
                <Field>
                  <FieldLabel>Description</FieldLabel>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    rows={3}
                  />
                </Field>
              </FieldGroup>
            </div>
            <SheetFooter className="flex-row gap-2 sm:flex-row">
              {isEdit && !batchMode && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete
                </Button>
              )}
              <div className="flex-1" />
              <Button type="submit" disabled={isSaving || overlaps}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
