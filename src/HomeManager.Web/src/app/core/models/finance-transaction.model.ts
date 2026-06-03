export type TransactionType = 'income' | 'expense' | 'transfer';
export type TransactionCategory = 'lf' | 'cf' | 'co' | 'mt' | 'pr' | 'es';

export interface FinanceTransaction {
  id: string;
  householdId: string;
  createdBy?: string;
  accountId?: string;
  accountName?: string;
  toAccountId?: string;
  toAccountName?: string;
  toAmount?: number;
  description: string;
  amount: number;
  currency: string;
  date: string;       // ISO date string YYYY-MM-DD
  refMonth: string;   // YYYY-MM
  type: TransactionType;
  category?: TransactionCategory;
  createdAt: string;
}

export interface CreateTransactionRequest {
  householdId: string;
  accountId?: string;
  description: string;
  amount: number;
  currency: string;
  date: string;       // YYYY-MM-DD
  type: TransactionType;
  category?: TransactionCategory;
  refMonth?: string;  // YYYY-MM; if absent, computed by backend
  toAccountId?: string;
  toAmount?: number;
}

export interface UpdateTransactionRequest {
  accountId?: string;
  description?: string;
  amount?: number;
  currency?: string;
  date?: string;
  type?: TransactionType;
  category?: TransactionCategory;
  refMonth?: string;
  toAccountId?: string;
  toAmount?: number;
}

export interface PagedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ImportResult {
  imported: number;
  skipped: number;
}
