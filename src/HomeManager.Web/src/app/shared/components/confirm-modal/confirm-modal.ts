import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  template: `
    <div class="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
      (click)="onCancel()">
      <div class="bg-white w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-4"
        (click)="$event.stopPropagation()">
        @if (title) {
          <h3 class="text-base font-semibold text-stone-800">{{ title }}</h3>
        }
        <p class="text-sm text-stone-600">{{ message }}</p>
        <div class="flex gap-2 pt-2">
          <button type="button" (click)="onCancel()"
            class="flex-1 py-2 rounded-lg text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">
            {{ cancelLabel }}
          </button>
          <button type="button" (click)="onConfirm()"
            class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            [class.bg-red-600]="destructive"
            [class.hover:bg-red-700]="destructive"
            [class.bg-emerald-600]="!destructive"
            [class.hover:bg-emerald-700]="!destructive"
            [class.text-white]="true">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmModalComponent {
  @Input() title = '';
  @Input() message = '';
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Cancelar';
  @Input() destructive = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void { this.confirmed.emit(); }
  onCancel(): void { this.cancelled.emit(); }
}
