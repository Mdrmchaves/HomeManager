import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InventoryItem,
  CreateItemRequest,
  UpdateItemRequest
} from '../models/inventory-item.model';

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
    return this.http.get<InventoryItem[]>(`${this.apiUrl}/items`, { params });
  }

  getItem(id: string): Observable<InventoryItem> {
    return this.http.get<InventoryItem>(`${this.apiUrl}/items/${id}`);
  }

  createItem(request: CreateItemRequest): Observable<InventoryItem> {
    return this.http.post<InventoryItem>(`${this.apiUrl}/items`, request);
  }

  updateItem(id: string, request: UpdateItemRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/items/${id}`, request);
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/items/${id}`);
  }
}
