export interface Category {
  id: string;
  householdId: string;
  name: string;
  type: string;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  type: string;
}

export interface UpdateCategoryRequest {
  name?: string;
}
