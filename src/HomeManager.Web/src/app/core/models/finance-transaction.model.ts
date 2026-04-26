export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 'lf' | 'cf' | 'co' | 'mt' | 'pr' | 'es';

export interface FinanceTransaction {
  id: string;
  householdId: string;
  createdBy?: string;
  accountId?: string;
  accountName?: string;
  fromTemplateId?: string;
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
}

export interface FinanceTemplate {
  id: string;
  householdId: string;
  accountId?: string;
  accountName?: string;
  description: string;
  amount: number;
  currency: string;
  category?: TransactionCategory;
  dayOfMonth: number;
  createdAt: string;
}

export interface CreateTemplateRequest {
  householdId: string;
  accountId?: string;
  description: string;
  amount: number;
  currency: string;
  category?: TransactionCategory;
  dayOfMonth: number;
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

export interface ApplyResult {
  generated: number;
  skipped: number;
}
