import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EventsListComponent } from './pages/events-list/events-list.component';
import { EventDetailComponent } from './pages/event-detail/event-detail.component';

const routes: Routes = [
  { path: '', component: EventsListComponent },
  { path: 'event/:id', component: EventDetailComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
