export interface CategoryRef {
  id: string;
  name: string;
  type: string;
}

export interface LocationRef {
  id: string;
  name: string;
  icon?: string;
}

export interface InventoryItem {
  id: string;
  householdId: string;
  name: string;
  description?: string;
  value?: number;
  photoUrl?: string;
  location?: string;
  locationId?: string;
  locationRef?: LocationRef;
  category?: CategoryRef;
  categoryId?: string;
  quantity?: number;
  destination?: 'Undecided' | 'Take' | 'Sell' | 'Donate' | 'Trash';
  ownerId?: string;
  tags?: string[];
  listId?: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: any;
  list?: any;
}

export interface CreateItemRequest {
  householdId: string;
  name: string;
  description?: string;
  value?: number;
  photoUrl?: string;
  location?: string;
  locationId?: string;
  categoryId?: string;
  quantity?: number;
  destination?: string;
  ownerId?: string;
  tags?: string;
  listId?: string;
}

export interface UpdateItemRequest {
  name?: string;
  description?: string;
  value?: number;
  photoUrl?: string;
  location?: string;
  locationId?: string;
  categoryId?: string;
  quantity?: number;
  destination?: string;
  ownerId?: string;
  tags?: string;
  listId?: string;
}
