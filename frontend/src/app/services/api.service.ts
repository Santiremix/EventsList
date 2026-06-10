import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Event {
  id: number;
  name: string;
  date: string | null;
  created_at: string;
  total: number;
  paid_count: number;
}

export interface Companion {
  id: number;
  participant_id: number;
  paid: number;
  created_at: string;
}

export interface Participant {
  id: number;
  event_id: number;
  name: string;
  paid: number;
  companion_list: Companion[];
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '/api';

  constructor(private http: HttpClient) {}

  getEvents(): Observable<Event[]> {
    return this.http.get<Event[]>(`${this.base}/events`);
  }

  createEvent(name: string, date?: string): Observable<Event> {
    return this.http.post<Event>(`${this.base}/events`, { name, date });
  }

  deleteEvent(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/events/${id}`);
  }

  getParticipants(eventId: number): Observable<Participant[]> {
    return this.http.get<Participant[]>(`${this.base}/events/${eventId}/participants`);
  }

  addParticipant(eventId: number, name: string, companions: number = 0): Observable<Participant> {
    return this.http.post<Participant>(`${this.base}/events/${eventId}/participants`, { name, companions });
  }

  togglePaid(participantId: number, paid: boolean): Observable<Participant> {
    return this.http.patch<Participant>(`${this.base}/participants/${participantId}/paid`, { paid });
  }

  toggleCompanionPaid(companionId: number, paid: boolean): Observable<Companion> {
    return this.http.patch<Companion>(`${this.base}/companions/${companionId}/paid`, { paid });
  }

  deleteParticipant(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/participants/${id}`);
  }
}
