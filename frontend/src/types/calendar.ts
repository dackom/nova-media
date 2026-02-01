import type { ApiEvent } from "./event";

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: ApiEvent;
}
