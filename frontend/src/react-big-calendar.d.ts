declare module "react-big-calendar" {
  import type { ComponentType } from "react";

  export type View = "month" | "week" | "day" | "agenda" | "work_week";

  export interface DateLocalizer {
    formats: Record<string, string | ((...args: unknown[]) => string)>;
    startOfWeek: (date: Date) => Date;
    endOfWeek: (date: Date) => Date;
    startOfMonth: (date: Date) => Date;
    endOfMonth: (date: Date) => Date;
    startOfDay: (date: Date) => Date;
    endOfDay: (date: Date) => Date;
    format: (value: Date | string, format: string, culture?: string) => string;
    getTimezoneOffset: (date: Date) => number;
  }

  export function dateFnsLocalizer(config: {
    format: (date: string | number | Date, format: string, options?: object) => string;
    startOfWeek: (date: Date, options?: object) => Date;
    getDay: (date: Date) => number;
    locales?: Record<string, unknown>;
  }): DateLocalizer;

  export interface BigCalendarEvent {
    id?: string;
    title?: string;
    start?: Date;
    end?: Date;
    resource?: unknown;
  }

  export interface CalendarProps<TEvent extends BigCalendarEvent = BigCalendarEvent> {
    localizer: DateLocalizer;
    events: TEvent[];
    startAccessor: keyof TEvent | ((event: TEvent) => Date);
    endAccessor: keyof TEvent | ((event: TEvent) => Date);
    style?: React.CSSProperties;
    date?: Date;
    onNavigate?: (date: Date) => void;
    view?: View;
    onView?: (view: View) => void;
    onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
    onSelectEvent?: (event: TEvent) => void;
    onRangeChange?: (range: Date[] | { start: Date; end: Date }) => void;
    selectable?: boolean;
    views?: View[];
  }

  // Use `any` for TEvent default so custom event types (e.g. CalendarEvent) infer correctly
  export const Calendar: ComponentType<CalendarProps<any>>;
}
