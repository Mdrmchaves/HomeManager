export type ItemStatus = 'ok' | 'warning' | 'low';

// ─── Locations ────────────────────────────────────────────────────────────────

export interface MockLocation {
  id: string;
  name: string;
  icon?: string;
}

export const MOCK_LOCATIONS: MockLocation[] = [
  { id: 'loc-cozinha', name: 'Cozinha' },
  { id: 'loc-sala', name: 'Sala' },
  { id: 'loc-quarto', name: 'Quarto Principal' },
  { id: 'loc-oficina', name: 'Oficina' },
  { id: 'loc-banho', name: 'Casa de Banho' },
  { id: 'loc-garagem', name: 'Garagem' },
];

// ─── Pertences ────────────────────────────────────────────────────────────────

export interface MockPertencesItem {
  id: string;
  name: string;
  value?: number;
  locationId?: string;
  category: string;
  destination?: 'Undecided' | 'Take' | 'Sell' | 'Donate' | 'Trash';
}

export const MOCK_PERTENCES_ITEMS: MockPertencesItem[] = [
  { id: 'per-1',  name: 'Smart TV Samsung 55"',   value: 899,  locationId: 'loc-sala',    category: 'Eletrónicos' },
  { id: 'per-2',  name: 'MacBook Air M2',          value: 1299, locationId: 'loc-oficina', category: 'Eletrónicos' },
  { id: 'per-3',  name: 'Sofá Retrátil',           value: 650,  locationId: 'loc-sala',    category: 'Mobiliário' },
  { id: 'per-4',  name: 'Mesa de Jantar',           value: 420,  locationId: 'loc-sala',    category: 'Mobiliário' },
  { id: 'per-5',  name: 'Frigorífico Bosch',        value: 780,  locationId: 'loc-cozinha', category: 'Eletrodomésticos' },
  { id: 'per-6',  name: 'Micro-ondas Samsung',      value: 120,  locationId: 'loc-cozinha', category: 'Eletrodomésticos' },
  { id: 'per-7',  name: 'Cama King Size',           value: 950,  locationId: 'loc-quarto',  category: 'Mobiliário' },
  { id: 'per-8',  name: 'Cadeira de Escritório',    value: 340,  locationId: 'loc-oficina', category: 'Mobiliário' },
  { id: 'per-9',  name: 'PlayStation 5',            value: 499,  locationId: 'loc-sala',    category: 'Eletrónicos' },
  { id: 'per-10', name: 'Bicicleta Elétrica',       value: 1100, locationId: 'loc-garagem', category: 'Lazer' },
  { id: 'per-11', name: 'Aspirador Dyson',          value: 380,  locationId: 'loc-cozinha', category: 'Eletrodomésticos', destination: 'Sell' },
  { id: 'per-12', name: 'Monitor 4K 27"',           value: 460,  locationId: 'loc-oficina', category: 'Eletrónicos' },
];

// ─── Despensa ─────────────────────────────────────────────────────────────────

export interface MockDespensaItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  status: ItemStatus;
  locationId?: string;
  category: string;
}

export const MOCK_DESPENSA_ITEMS: MockDespensaItem[] = [
  { id: 'des-1',  name: 'Arroz Agulha',         quantity: 2, unit: 'kg',       status: 'ok',      locationId: 'loc-cozinha', category: 'Alimentos' },
  { id: 'des-2',  name: 'Azeite Virgem Extra',   quantity: 1, unit: 'L',        status: 'ok',      locationId: 'loc-cozinha', category: 'Alimentos' },
  { id: 'des-3',  name: 'Massa Esparguete',      quantity: 3, unit: 'un',       status: 'ok',      locationId: 'loc-cozinha', category: 'Alimentos' },
  { id: 'des-4',  name: 'Leite UHT',             quantity: 1, unit: 'L',        status: 'low',     locationId: 'loc-cozinha', category: 'Alimentos' },
  { id: 'des-5',  name: 'Ovos',                  quantity: 0, unit: 'un',       status: 'low',     locationId: 'loc-cozinha', category: 'Alimentos' },
  { id: 'des-6',  name: 'Café Moído',            quantity: 1, unit: 'un',       status: 'ok',      locationId: 'loc-cozinha', category: 'Bebidas' },
  { id: 'des-7',  name: 'Água (5L)',             quantity: 4, unit: 'garrafas', status: 'ok',      locationId: 'loc-cozinha', category: 'Bebidas' },
  { id: 'des-8',  name: 'Sumo de Laranja',       quantity: 1, unit: 'L',        status: 'warning', locationId: 'loc-cozinha', category: 'Bebidas' },
  { id: 'des-9',  name: 'Detergente Loiça',      quantity: 1, unit: 'un',       status: 'warning', locationId: 'loc-cozinha', category: 'Limpeza' },
  { id: 'des-10', name: 'Esponjas',              quantity: 4, unit: 'un',       status: 'ok',      locationId: 'loc-cozinha', category: 'Limpeza' },
  { id: 'des-11', name: 'Lixívia',              quantity: 2, unit: 'un',       status: 'ok',      locationId: 'loc-banho',   category: 'Limpeza' },
  { id: 'des-12', name: 'Detergente da Roupa',   quantity: 0, unit: 'un',       status: 'low',     locationId: 'loc-banho',   category: 'Limpeza' },
  { id: 'des-13', name: 'Champô',               quantity: 1, unit: 'un',       status: 'ok',      locationId: 'loc-banho',   category: 'Higiene' },
  { id: 'des-14', name: 'Pasta de Dentes',       quantity: 2, unit: 'un',       status: 'ok',      locationId: 'loc-banho',   category: 'Higiene' },
  { id: 'des-15', name: 'Papel Higiénico',      quantity: 2, unit: 'rolos',    status: 'warning', locationId: 'loc-banho',   category: 'Higiene' },
];
