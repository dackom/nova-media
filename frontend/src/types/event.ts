export interface ApiEventPatient {
  _id: string;
  name: string;
  timezone?: string;
}

export interface ApiEventDoctor {
  _id: string;
  name: string;
}

export interface ApiEvent {
  _id: string;
  doctor: string | ApiEventDoctor;
  patient: string | ApiEventPatient;
  utcStartDateTime: string;
  duration: number;
  title?: string;
  description?: string;
}

export interface EventsResponse {
  events: ApiEvent[];
}

export interface EventFormData {
  patient: string;
  utcStartDateTime?: string;
  utcStartDateRange?: { start: string; end: string };
  duration: number;
  title?: string;
  description?: string;
}
