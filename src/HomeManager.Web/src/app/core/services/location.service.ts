import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Location } from '../models/location.model';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class LocationService {
  constructor(private http: HttpClient) {}

  getLocations(householdId: string): Observable<Location[]> {
    return this.http
      .get<ApiResponse<Location[]>>(`${environment.apiUrl}/households/${householdId}/locations`)
      .pipe(map(r => r.data ?? []));
  }

  addLocation(name: string, householdId: string, icon?: string): Observable<Location> {
    return this.http
      .post<ApiResponse<Location>>(`${environment.apiUrl}/households/${householdId}/locations`, { name, icon })
      .pipe(map(r => r.data));
  }

  updateLocation(id: string, name: string, icon?: string): Observable<Location> {
    return this.http
      .put<ApiResponse<Location>>(`${environment.apiUrl}/locations/${id}`, { name, icon })
      .pipe(map(r => r.data));
  }

  deleteLocation(id: string): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiUrl}/locations/${id}`);
  }
}
