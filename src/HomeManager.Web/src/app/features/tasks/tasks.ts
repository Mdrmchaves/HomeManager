import { Component } from '@angular/core';

@Component({
  selector: 'app-tasks',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center py-24 text-center">
      <div class="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
        </svg>
      </div>
      <h2 class="text-xl font-bold text-stone-800 mb-2">Módulo de Tarefas</h2>
      <p class="text-stone-400 text-sm">Em breve...</p>
    </div>
  `
})
export class TasksComponent {}
