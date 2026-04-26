export type FinanceCategory = 'lf' | 'cf' | 'co' | 'mt' | 'pr' | 'es';

export const FINANCE_CATEGORIES: FinanceCategory[] = ['lf', 'cf', 'co', 'mt', 'pr', 'es'];

export const CATEGORY_LABELS: Record<FinanceCategory, string> = {
  lf: 'Liberdade Financeira',
  cf: 'Custos Fixos',
  co: 'Conforto',
  mt: 'Metas',
  pr: 'Prazeres',
  es: 'Estudo',
};

export const CATEGORY_COLORS: Record<FinanceCategory, string> = {
  lf: 'bg-violet-100 text-violet-700 border-violet-300',
  cf: 'bg-blue-100 text-blue-700 border-blue-300',
  co: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  mt: 'bg-amber-100 text-amber-700 border-amber-300',
  pr: 'bg-pink-100 text-pink-700 border-pink-300',
  es: 'bg-cyan-100 text-cyan-700 border-cyan-300',
};

export const CATEGORY_DOT_COLORS: Record<FinanceCategory, string> = {
  lf: 'bg-violet-500',
  cf: 'bg-blue-500',
  co: 'bg-emerald-500',
  mt: 'bg-amber-500',
  pr: 'bg-pink-500',
  es: 'bg-cyan-500',
};

export interface FinanceBudget {
  id: string;
  householdId: string;
  income: number;
  incomeCurrency: string;
  goals: Record<FinanceCategory, number>; // 0-100 (percentages)
  updatedAt: string;
}

export interface UpsertBudgetRequest {
  householdId: string;
  income: number;
  incomeCurrency: string;
  goals: Record<string, number>;
}

export interface FinanceRates {
  id: string;
  householdId: string;
  rates: Record<string, number>; // { BRL: 1, EUR: 6.0, USD: 5.5, PYG: 0.0007 }
  updatedAt: string;
}

export interface UpsertRatesRequest {
  householdId: string;
  rates: Record<string, number>;
}

// Dashboard
export interface CategoryBreakdown {
  category: FinanceCategory;
  total: number;
  budget: number;
  usedPercent: number;
}

export interface AccountInvoice {
  accountId: string;
  accountName: string;
  currency: string;
  invoiceTotal: number;
  limit?: number;
  usedPercent: number;
  isOverLimit: boolean;
}

export interface MonthlyHistoryPoint {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
}

export interface FinanceDashboard {
  month: string;
  baseCurrency: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  byCategory: CategoryBreakdown[];
  invoices: AccountInvoice[];
  history: MonthlyHistoryPoint[];
}

export const SUPPORTED_CURRENCIES = ['BRL', 'EUR', 'USD', 'PYG'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
  BRL: 'R$',
  EUR: '€',
  USD: '$',
  PYG: '₲',
};
