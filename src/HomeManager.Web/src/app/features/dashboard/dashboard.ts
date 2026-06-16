import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
      </div>
      <h2 class="text-xl font-bold text-stone-800 mb-2">Início</h2>
      <p class="text-stone-400 text-sm">Em breve...</p>
    </div>
  `
})
export class DashboardComponent {}
