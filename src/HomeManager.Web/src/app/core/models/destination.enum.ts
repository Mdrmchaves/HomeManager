export enum Destination {
  Keep = 'Keep',
  Sell = 'Sell',
  Donate = 'Donate',
  Trash = 'Trash',
}

export const DESTINATION_LABELS: Record<string, string> = {
  [Destination.Keep]: 'Manter',
  [Destination.Sell]: 'Vender',
  [Destination.Donate]: 'Doar',
  [Destination.Trash]: 'Descartar',
};

export const DESTINATION_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'Todos', label: 'Todos' },
  { value: 'Indefinido', label: 'Indefinido' },
  { value: Destination.Keep, label: 'Manter' },
  { value: Destination.Sell, label: 'Vender' },
  { value: Destination.Donate, label: 'Doar' },
  { value: Destination.Trash, label: 'Descartar' },
];
