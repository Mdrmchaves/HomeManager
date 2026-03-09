export type TimelineEventType = 'restock' | 'warranty' | 'task';

export interface TimelineEvent {
  id: string;
  date: Date;
  title: string;
  sourceModule: string;
  type: TimelineEventType;
}

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const in3Days = new Date(today);
in3Days.setDate(today.getDate() + 3);
const in7Days = new Date(today);
in7Days.setDate(today.getDate() + 7);
const in14Days = new Date(today);
in14Days.setDate(today.getDate() + 14);

export const MOCK_TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: '1',
    date: today,
    title: 'Repor leite e ovos',
    sourceModule: 'Despensa',
    type: 'restock',
  },
  {
    id: '2',
    date: today,
    title: 'Comprar detergente para a roupa',
    sourceModule: 'Despensa',
    type: 'restock',
  },
  {
    id: '3',
    date: tomorrow,
    title: 'Verificar garantia do frigorífico',
    sourceModule: 'Pertences',
    type: 'warranty',
  },
  {
    id: '4',
    date: in3Days,
    title: 'Repor papel higiénico',
    sourceModule: 'Despensa',
    type: 'restock',
  },
  {
    id: '5',
    date: in7Days,
    title: 'Garantia do MacBook termina',
    sourceModule: 'Pertences',
    type: 'warranty',
  },
  {
    id: '6',
    date: in14Days,
    title: 'Repor azeite e especiarias',
    sourceModule: 'Despensa',
    type: 'restock',
  },
];

export const MOCK_PANTRY_LOW_STOCK_COUNT = 4;
