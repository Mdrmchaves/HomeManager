export type PlanningItemType = 'fixed' | 'installment';

export interface FinancePlanningItem {
  id: string;
  householdId: string;
  description: string;
  amount: number;
  currency: string;
  category?: string;
  type: PlanningItemType;
  dayOfMonth?: number;
  totalInstallments?: number;
  installmentsPaid: number;
  isActive: boolean;
  createdAt: string;
  paidThisMonth: boolean;
  paidTransactionId?: string;
  paidViaCC: boolean;
}

export interface CreatePlanningItemRequest {
  householdId: string;
  description: string;
  amount: number;
  currency: string;
  category?: string;
  type: PlanningItemType;
  dayOfMonth?: number;
  totalInstallments?: number;
  installmentsPaid?: number;
}

export interface UpdatePlanningItemRequest {
  description: string;
  amount: number;
  currency: string;
  category?: string;
  type: PlanningItemType;
  dayOfMonth?: number;
  totalInstallments?: number;
  installmentsPaid: number;
  isActive: boolean;
}
