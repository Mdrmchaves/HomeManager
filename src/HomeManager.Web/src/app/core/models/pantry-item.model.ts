export interface PantryItem {
  id: string;
  householdId: string;
  name: string;
  quantity: number;
  unit?: string;
  minQuantity?: number;
  expirationDate?: string;
  locationId?: string;
  locationName?: string;
  categoryId?: string;
  categoryName?: string;
  notes?: string;
  status: 'ok' | 'low';
  createdAt: string;
  updatedAt: string;
}

export interface CreatePantryItemRequest {
  householdId: string;
  name: string;
  quantity: number;
  unit?: string;
  minQuantity?: number;
  expirationDate?: string;
  locationId?: string;
  categoryId?: string;
  notes?: string;
}

export interface UpdatePantryItemRequest {
  name?: string;
  quantity?: number;
  unit?: string;
  minQuantity?: number;
  expirationDate?: string;
  locationId?: string;
  categoryId?: string;
  notes?: string;
}
