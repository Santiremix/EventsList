import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService, Companion, Participant } from '../../services/api.service';

@Component({
  selector: 'app-event-detail',
  templateUrl: './event-detail.component.html',
  styleUrls: ['./event-detail.component.scss']
})
export class EventDetailComponent implements OnInit {
  eventId!: number;
  eventName = '';
  participants: Participant[] = [];
  loading = false;
  newName = '';
  newCompanions = 0;
  searchQuery = '';
  filterMode: 'todos' | 'pendientes' | 'pagados' = 'todos';
  private expanded = new Set<number>();

  private normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  get filtered(): Participant[] {
    const q = this.normalize(this.searchQuery.trim());
    let list = q
      ? this.participants.filter(p => this.normalize(p.name).includes(q))
      : [...this.participants];

    if (this.filterMode === 'pagados') {
      list = list.filter(p => this.isFullyPaid(p));
    } else if (this.filterMode === 'pendientes') {
      list = list.filter(p => !this.isFullyPaid(p));
      // parcialmente pagados primero, luego sin pagar
      list.sort((a, b) => {
        const aPartial = this.isPartiallyPaid(a) ? 0 : 1;
        const bPartial = this.isPartiallyPaid(b) ? 0 : 1;
        return aPartial - bPartial;
      });
    }

    return list;
  }

  get totalPeople(): number {
    return this.participants.reduce((sum, p) => sum + 1 + (p.companion_list?.length || 0), 0);
  }

  get paidCount(): number {
    let count = 0;
    for (const p of this.participants) {
      if (p.paid) count++;
      count += (p.companion_list || []).filter(c => c.paid).length;
    }
    return count;
  }

  isFullyPaid(p: Participant): boolean {
    if (!p.paid) return false;
    return (p.companion_list || []).every(c => c.paid);
  }

  isPartiallyPaid(p: Participant): boolean {
    if (!p.paid) return false;
    return (p.companion_list || []).some(c => !c.paid);
  }

  isExpanded(id: number): boolean {
    return this.expanded.has(id);
  }

  toggleExpand(id: number): void {
    this.expanded.has(id) ? this.expanded.delete(id) : this.expanded.add(id);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.eventId = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getEvents().subscribe({
      next: (events) => {
        const ev = events.find(e => e.id === this.eventId);
        if (ev) this.eventName = ev.name;
      }
    });
    this.loadParticipants();
  }

  loadParticipants(): void {
    this.loading = true;
    this.api.getParticipants(this.eventId).subscribe({
      next: (data) => { this.participants = data; this.loading = false; },
      error: () => { this.snack.open('Error cargando participantes', 'OK', { duration: 3000 }); this.loading = false; }
    });
  }

  addParticipant(): void {
    if (!this.newName.trim()) return;
    this.api.addParticipant(this.eventId, this.newName.trim(), this.newCompanions).subscribe({
      next: (p) => {
        this.participants.push(p);
        this.participants.sort((a, b) => a.name.localeCompare(b.name));
        this.newName = '';
        this.newCompanions = 0;
        const n = p.companion_list?.length || 0;
        const label = n > 0 ? `${p.name} y ${n} acompañantes añadidos` : `${p.name} añadido`;
        this.snack.open(label, '', { duration: 1500 });
      },
      error: () => this.snack.open('Error al añadir', 'OK', { duration: 3000 })
    });
  }

  togglePaid(participant: Participant): void {
    const newPaid = !participant.paid;
    this.api.togglePaid(participant.id, newPaid).subscribe({
      next: (updated) => {
        const idx = this.participants.findIndex(p => p.id === updated.id);
        if (idx !== -1) this.participants[idx] = { ...updated, companion_list: this.participants[idx].companion_list };
      },
      error: () => this.snack.open('Error al actualizar', 'OK', { duration: 3000 })
    });
  }

  toggleCompanionPaid(companion: Companion, participant: Participant): void {
    this.api.toggleCompanionPaid(companion.id, !companion.paid).subscribe({
      next: (updated) => {
        const pIdx = this.participants.findIndex(p => p.id === participant.id);
        if (pIdx === -1) return;
        const cIdx = this.participants[pIdx].companion_list.findIndex(c => c.id === updated.id);
        if (cIdx !== -1) this.participants[pIdx].companion_list[cIdx] = updated;
      },
      error: () => this.snack.open('Error al actualizar', 'OK', { duration: 3000 })
    });
  }

  deleteParticipant(participant: Participant): void {
    if (!confirm(`¿Eliminar a ${participant.name}?`)) return;
    this.api.deleteParticipant(participant.id).subscribe({
      next: () => {
        this.participants = this.participants.filter(p => p.id !== participant.id);
        this.snack.open('Participante eliminado', '', { duration: 1500 });
      },
      error: () => this.snack.open('Error al eliminar', 'OK', { duration: 3000 })
    });
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
}
