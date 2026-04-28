export interface FinanceAccount {
  id: string;
  householdId: string;
  ownerId?: string;
  name: string;
  currency: string;
  type: 'account' | 'cc';
  closeDay?: number;
  closeMonthIsNext: boolean;
  dueDay?: number;
  limit?: number;
  balance: number;
  currentInvoice?: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateAccountRequest {
  householdId: string;
  name: string;
  currency: string;
  type: 'account' | 'cc';
  closeDay?: number;
  closeMonthIsNext: boolean;
  dueDay?: number;
  limit?: number;
  balance?: number;
}

export interface ImportAccountItem {
  name: string;
  currency: string;
  type: 'account' | 'cc';
  closeDay?: number;
  closeMonthIsNext: boolean;
  dueDay?: number;
  limit?: number;
  balance?: number;
}

export interface UpdateAccountRequest {
  name?: string;
  currency?: string;
  type?: 'account' | 'cc';
  closeDay?: number;
  closeMonthIsNext?: boolean;
  dueDay?: number;
  limit?: number;
  balance?: number;
  isActive?: boolean;
}
