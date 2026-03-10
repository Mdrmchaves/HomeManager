import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-block',
  standalone: true,
  template: `<div [class]="cls" [style.width]="width" [style.height]="height"></div>`
})
export class SkeletonBlockComponent {
  @Input() variant: 'line' | 'circle' | 'box' = 'line';
  @Input() width?: string;
  @Input() height?: string;

  get cls(): string {
    const base = 'animate-pulse bg-stone-200';
    if (this.variant === 'circle') return `${base} rounded-full`;
    if (this.variant === 'box') return `${base} rounded-xl`;
    return `${base} rounded`;
  }
}
