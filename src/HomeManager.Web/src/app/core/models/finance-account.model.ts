export interface FinanceAccount {
  id: string;
  householdId: string;
  ownerId?: string;
  name: string;
  currency: string;
  type: 'account' | 'cc';
  closeDay?: number;
  dueDay?: number;
  limit?: number;
  balance: number;
  createdAt: string;
}

export interface CreateAccountRequest {
  householdId: string;
  name: string;
  currency: string;
  type: 'account' | 'cc';
  closeDay?: number;
  dueDay?: number;
  limit?: number;
  balance?: number;
}

export interface ImportAccountItem {
  name: string;
  currency: string;
  type: 'account' | 'cc';
  closeDay?: number;
  dueDay?: number;
  limit?: number;
  balance?: number;
}

export interface UpdateAccountRequest {
  name?: string;
  currency?: string;
  type?: 'account' | 'cc';
  closeDay?: number;
  dueDay?: number;
  limit?: number;
  balance?: number;
}
