import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Household, CreateHouseholdRequest } from '../models/household.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class HouseholdService {
  private apiUrl = `${environment.apiUrl}/household`;

  constructor(private http: HttpClient) {}

  getMyHouseholds(): Observable<Household[]> {
    return this.http.get<ApiResponse<Household[]>>(this.apiUrl).pipe(
      map(response => response.data)
    );
  }

  getHousehold(id: string): Observable<Household> {
    return this.http.get<ApiResponse<Household>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  createHousehold(request: CreateHouseholdRequest): Observable<Household> {
    return this.http.post<ApiResponse<Household>>(this.apiUrl, request).pipe(
      map(response => response.data)
    );
  }

  joinHousehold(inviteCode: string): Observable<Household> {
    return this.http.post<ApiResponse<Household>>(`${this.apiUrl}/join/${inviteCode}`, {}).pipe(
      map(response => response.data)
    );
  }
}
