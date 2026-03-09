import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Household, CreateHouseholdRequest } from '../models/household.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class HouseholdService {
  private apiUrl = `${environment.apiUrl}/household`;
  private selectedHouseholdSubject = new BehaviorSubject<Household | null>(null);
  public selectedHousehold$ = this.selectedHouseholdSubject.asObservable();

  constructor(private http: HttpClient) {}

  getMyHouseholds(): Observable<Household[]> {
    return this.http.get<ApiResponse<Household[]>>(this.apiUrl).pipe(
      map(response => response.data),
      tap(households => {
        if (households?.length && !this.selectedHouseholdSubject.value) {
          this.selectedHouseholdSubject.next(households[0]);
        }
      })
    );
  }

  getHousehold(id: string): Observable<Household> {
    return this.http.get<ApiResponse<Household>>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data)
    );
  }

  createHousehold(request: CreateHouseholdRequest): Observable<Household> {
    return this.http.post<ApiResponse<Household>>(this.apiUrl, request).pipe(
      map(response => response.data),
      tap(household => this.selectedHouseholdSubject.next(household))
    );
  }

  joinHousehold(inviteCode: string): Observable<Household> {
    return this.http.post<ApiResponse<Household>>(`${this.apiUrl}/join/${inviteCode}`, {}).pipe(
      map(response => response.data),
      tap(household => this.selectedHouseholdSubject.next(household))
    );
  }

  selectHousehold(household: Household): void {
    this.selectedHouseholdSubject.next(household);
  }

  getSelectedHousehold(): Household | null {
    return this.selectedHouseholdSubject.value;
  }
}
