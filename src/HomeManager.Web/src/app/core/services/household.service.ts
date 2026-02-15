import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { Household, CreateHouseholdRequest } from '../models/household.model';

@Injectable({
  providedIn: 'root'
})
export class HouseholdService {
  private apiUrl = `${environment.apiUrl}/household`;

  constructor(private http: HttpClient) {}

  getMyHouseholds(): Observable<Household[]> {
    return this.http.get<Household[]>(this.apiUrl);
  }

  getHousehold(id: string): Observable<Household> {
    return this.http.get<Household>(`${this.apiUrl}/${id}`);
  }

  createHousehold(request: CreateHouseholdRequest): Observable<Household> {
    return this.http.post<Household>(this.apiUrl, request);
  }

  joinHousehold(inviteCode: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/join/${inviteCode}`, {});
  }
}