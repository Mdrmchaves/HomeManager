import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-summary-widget',
  standalone: true,
  imports: [RouterLink, NgClass],
  template: `
    <a
      [routerLink]="link"
      class="block bg-white rounded-2xl shadow-sm border border-stone-200 p-5 hover:shadow-md transition-shadow duration-150 cursor-pointer"
    >
      <div class="flex items-start justify-between mb-3">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
             [ngClass]="theme === 'emerald' ? 'bg-emerald-50' : 'bg-amber-50'">
          <span [innerHTML]="iconSvg" [ngClass]="theme === 'emerald' ? 'text-emerald-600' : 'text-amber-600'"></span>
        </div>
      </div>
      <p class="text-2xl font-bold mb-1" [ngClass]="theme === 'emerald' ? 'text-emerald-700' : 'text-amber-700'">{{ value }}</p>
      <p class="text-sm font-medium text-stone-600">{{ label }}</p>
      @if (subtitle) {
        <p class="text-xs text-stone-400 mt-0.5">{{ subtitle }}</p>
      }
    </a>
  `
})
export class SummaryWidgetComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() subtitle = '';
  @Input() link = '/';
  @Input() theme: 'emerald' | 'amber' = 'emerald';
  @Input() iconSvg = '';
}
