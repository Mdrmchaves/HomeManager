import { Component } from '@angular/core';
import { NgClass } from '@angular/common';
import {
  MOCK_TIMELINE_EVENTS,
  TimelineEvent,
  TimelineEventType
} from '../../../../core/mock/dashboard.mock';

@Component({
  selector: 'app-timeline-widget',
  standalone: true,
  imports: [NgClass],
  templateUrl: './timeline-widget.html'
})
export class TimelineWidgetComponent {
  events: TimelineEvent[] = MOCK_TIMELINE_EVENTS;

  formatDate(date: Date): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (this.isSameDay(date, today)) return 'HOJE';
    if (this.isSameDay(date, tomorrow)) return 'AMANHÃ';

    const days = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    return days[date.getDay()];
  }

  getDotClass(type: TimelineEventType): string {
    return type === 'warranty'
      ? 'bg-amber-500'
      : type === 'restock'
      ? 'bg-emerald-500'
      : 'bg-stone-400';
  }

  private isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
}
