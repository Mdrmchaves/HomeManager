import { Injectable } from '@angular/core';
import { Location } from '../models/location.model';
import { MOCK_LOCATIONS } from '../mock/inventory.mock';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private locations: Location[] = MOCK_LOCATIONS.map(l => ({
    ...l,
    householdId: 'mock-household',
  }));

  getLocations(): Location[] {
    return this.locations;
  }

  addLocation(name: string, householdId: string): Location {
    const loc: Location = {
      id: `loc-${Date.now()}`,
      name: name.trim(),
      householdId,
    };
    this.locations = [...this.locations, loc];
    return loc;
  }
}
