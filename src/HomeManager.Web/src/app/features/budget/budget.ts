import { Component } from '@angular/core';

@Component({
  selector: 'app-budget',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
        </svg>
      </div>
      <h2 class="text-xl font-bold text-stone-800 mb-2">Módulo de Orçamento</h2>
      <p class="text-stone-400 text-sm">Em breve...</p>
    </div>
  `
})
export class BudgetComponent {}
