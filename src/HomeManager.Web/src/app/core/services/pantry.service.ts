import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PantryItem, CreatePantryItemRequest, UpdatePantryItemRequest } from '../models/pantry-item.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class PantryService {
  private apiUrl = `${environment.apiUrl}/pantry`;

  constructor(private http: HttpClient) {}

  getItems(householdId: string, locationId?: string, category?: string, status?: string): Observable<PantryItem[]> {
    let params = new HttpParams().set('householdId', householdId);
    if (locationId) params = params.set('locationId', locationId);
    if (category) params = params.set('category', category);
    if (status) params = params.set('status', status);
    return this.http
      .get<ApiResponse<PantryItem[]>>(`${this.apiUrl}/items`, { params })
      .pipe(map(r => r.data ?? []));
  }

  getItem(id: string): Observable<PantryItem> {
    return this.http
      .get<ApiResponse<PantryItem>>(`${this.apiUrl}/items/${id}`)
      .pipe(map(r => r.data));
  }

  createItem(request: CreatePantryItemRequest): Observable<PantryItem> {
    return this.http
      .post<ApiResponse<PantryItem>>(`${this.apiUrl}/items`, request)
      .pipe(map(r => r.data));
  }

  updateItem(id: string, request: UpdatePantryItemRequest): Observable<PantryItem> {
    return this.http
      .put<ApiResponse<PantryItem>>(`${this.apiUrl}/items/${id}`, request)
      .pipe(map(r => r.data));
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/items/${id}`);
  }
}
