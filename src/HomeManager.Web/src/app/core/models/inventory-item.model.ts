export interface InventoryItem {
  id: string;
  householdId: string;
  name: string;
  description?: string;
  value?: number;
  photoUrl?: string;
  location?: string;
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
  location?: string;
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
  destination?: string;
  ownerId?: string;
  tags?: string;
  listId?: string;
}