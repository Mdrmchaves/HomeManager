export type ItemStatus = 'ok' | 'warning' | 'low';

export interface MockPantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  status: ItemStatus;
}

export interface MockPantryCategory {
  id: string;
  name: string;
  items: MockPantryItem[];
}

export const MOCK_PERTENCES_CATEGORIES: string[] = [
  'Eletrónicos',
  'Mobiliário',
  'Eletrodomésticos',
  'Lazer',
  'Outros',
];

export const MOCK_PANTRY_CATEGORIES: MockPantryCategory[] = [
  {
    id: 'alimentos',
    name: 'Alimentos Essenciais',
    items: [
      { id: 'p1', name: 'Leite', quantity: 1, unit: 'L', status: 'low' },
      { id: 'p2', name: 'Ovos', quantity: 0, unit: 'un', status: 'low' },
      { id: 'p3', name: 'Azeite', quantity: 1, unit: 'L', status: 'ok' },
      { id: 'p4', name: 'Arroz', quantity: 2, unit: 'kg', status: 'ok' },
      { id: 'p5', name: 'Massa', quantity: 3, unit: 'un', status: 'ok' },
      { id: 'p6', name: 'Sal', quantity: 1, unit: 'kg', status: 'ok' },
    ],
  },
  {
    id: 'limpeza',
    name: 'Limpeza',
    items: [
      { id: 'p7', name: 'Detergente da roupa', quantity: 0, unit: 'un', status: 'low' },
      { id: 'p8', name: 'Detergente da loiça', quantity: 1, unit: 'un', status: 'warning' },
      { id: 'p9', name: 'Limpador multiusos', quantity: 2, unit: 'un', status: 'ok' },
      { id: 'p10', name: 'Esponjas', quantity: 4, unit: 'un', status: 'ok' },
    ],
  },
  {
    id: 'higiene',
    name: 'Higiene',
    items: [
      { id: 'p11', name: 'Papel higiénico', quantity: 2, unit: 'rolos', status: 'warning' },
      { id: 'p12', name: 'Champô', quantity: 1, unit: 'un', status: 'ok' },
      { id: 'p13', name: 'Pasta de dentes', quantity: 2, unit: 'un', status: 'ok' },
    ],
  },
  {
    id: 'bebidas',
    name: 'Bebidas',
    items: [
      { id: 'p14', name: 'Água (5L)', quantity: 3, unit: 'garrafas', status: 'ok' },
      { id: 'p15', name: 'Sumo laranja', quantity: 1, unit: 'L', status: 'warning' },
      { id: 'p16', name: 'Café', quantity: 1, unit: 'un', status: 'ok' },
    ],
  },
];
