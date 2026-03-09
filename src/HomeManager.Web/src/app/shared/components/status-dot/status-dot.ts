import { Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-status-dot',
  standalone: true,
  imports: [NgClass],
  template: `
    <span
      class="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      [ngClass]="{
        'bg-emerald-500': status === 'ok',
        'bg-amber-500': status === 'warning' || status === 'low'
      }"
    ></span>
  `
})
export class StatusDotComponent {
  @Input() status: 'ok' | 'warning' | 'low' = 'ok';
}
