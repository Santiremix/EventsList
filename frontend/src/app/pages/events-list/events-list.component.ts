import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService, Event } from '../../services/api.service';

@Component({
  selector: 'app-events-list',
  templateUrl: './events-list.component.html',
  styleUrls: ['./events-list.component.scss']
})
export class EventsListComponent implements OnInit {
  events: Event[] = [];
  loading = false;
  newEventName = '';
  newEventDate = '';
  showForm = false;

  constructor(
    private api: ApiService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading = true;
    this.api.getEvents().subscribe({
      next: (data) => { this.events = data; this.loading = false; },
      error: () => { this.snack.open('Error conectando con el servidor', 'OK', { duration: 3000 }); this.loading = false; }
    });
  }

  createEvent(): void {
    if (!this.newEventName.trim()) return;
    this.api.createEvent(this.newEventName.trim(), this.newEventDate || undefined).subscribe({
      next: (event) => {
        this.events.unshift({ ...event, total: 0, paid_count: 0 });
        this.newEventName = '';
        this.newEventDate = '';
        this.showForm = false;
        this.snack.open('Evento creado', '', { duration: 2000 });
      },
      error: () => this.snack.open('Error al crear evento', 'OK', { duration: 3000 })
    });
  }

  deleteEvent(event: Event, e: MouseEvent): void {
    e.stopPropagation();
    if (!confirm(`¿Eliminar "${event.name}"? Se borrarán todos sus participantes.`)) return;
    this.api.deleteEvent(event.id).subscribe({
      next: () => {
        this.events = this.events.filter(ev => ev.id !== event.id);
        this.snack.open('Evento eliminado', '', { duration: 2000 });
      },
      error: () => this.snack.open('Error al eliminar', 'OK', { duration: 3000 })
    });
  }

  openEvent(event: Event): void {
    this.router.navigate(['/event', event.id]);
  }
}
