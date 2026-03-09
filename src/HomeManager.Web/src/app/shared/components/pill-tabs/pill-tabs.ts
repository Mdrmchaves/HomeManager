import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-pill-tabs',
  standalone: true,
  imports: [NgClass],
  template: `
    <div class="inline-flex bg-stone-200/60 rounded-full p-1 gap-1">
      @for (tab of tabs; track tab; let i = $index) {
        <button
          type="button"
          class="px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150"
          [ngClass]="{
            'bg-white shadow-sm text-stone-800': activeIndex === i,
            'text-stone-500 hover:text-stone-700': activeIndex !== i
          }"
          (click)="select(i)"
        >{{ tab }}</button>
      }
    </div>
  `
})
export class PillTabsComponent {
  @Input() tabs: string[] = [];
  @Input() activeIndex = 0;
  @Output() tabChange = new EventEmitter<number>();

  select(index: number): void {
    this.activeIndex = index;
    this.tabChange.emit(index);
  }
}
