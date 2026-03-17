import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  InventoryItem,
  CreateItemRequest,
  UpdateItemRequest
} from '../models/inventory-item.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private apiUrl = `${environment.apiUrl}/inventory`;

  constructor(private http: HttpClient) {}

  getItems(householdId?: string): Observable<InventoryItem[]> {
    let params = new HttpParams();
    if (householdId) {
      params = params.set('householdId', householdId);
    }
    return this.http.get<ApiResponse<InventoryItem[]>>(`${this.apiUrl}/items`, { params }).pipe(
      map(r => r.data)
    );
  }

  getItem(id: string): Observable<InventoryItem> {
    return this.http.get<ApiResponse<InventoryItem>>(`${this.apiUrl}/items/${id}`).pipe(
      map(r => r.data)
    );
  }

  createItem(request: CreateItemRequest): Observable<InventoryItem> {
    return this.http.post<ApiResponse<InventoryItem>>(`${this.apiUrl}/items`, request).pipe(
      map(r => r.data)
    );
  }

  updateItem(id: string, request: UpdateItemRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/items/${id}`, request);
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/items/${id}`);
  }
}
