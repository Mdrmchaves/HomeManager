import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../models/category.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  constructor(private http: HttpClient) {}

  getCategories(householdId: string, type?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (type) params = params.set('type', type);
    return this.http
      .get<ApiResponse<Category[]>>(`${environment.apiUrl}/households/${householdId}/categories`, { params })
      .pipe(map(r => r.data ?? []));
  }

  createCategory(householdId: string, request: CreateCategoryRequest): Observable<Category> {
    return this.http
      .post<ApiResponse<Category>>(`${environment.apiUrl}/households/${householdId}/categories`, request)
      .pipe(map(r => r.data));
  }

  updateCategory(id: string, request: UpdateCategoryRequest): Observable<Category> {
    return this.http
      .put<ApiResponse<Category>>(`${environment.apiUrl}/categories/${id}`, request)
      .pipe(map(r => r.data));
  }

  deleteCategory(id: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/categories/${id}`);
  }
}
