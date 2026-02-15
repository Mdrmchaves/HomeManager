export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: Date;
  updatedAt: Date;
  householdUsers?: HouseholdUser[];
}

export interface HouseholdUser {
  userId: string;
  householdId: string;
  role: 'owner' | 'member';
  joinedAt: Date;
  user?: User;
}

export interface CreateHouseholdRequest {
  name: string;
}

import { User } from './user.model';