import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-fab',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (link) {
      <a
        [routerLink]="link"
        class="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-150"
        [attr.aria-label]="label"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
      </a>
    } @else {
      <button
        type="button"
        (click)="clicked.emit()"
        class="md:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors duration-150"
        [attr.aria-label]="label"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
      </button>
    }
  `
})
export class FabComponent {
  @Input() link: string | string[] | null = null;
  @Input() label = 'Adicionar';
  @Output() clicked = new EventEmitter<void>();
}
