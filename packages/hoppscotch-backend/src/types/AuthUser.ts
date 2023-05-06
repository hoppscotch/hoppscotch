import { User } from '@prisma/client';

export type AuthUser = User;

export interface SSOProviderProfile {
  provider: string;
  id: string;
}

export type IsAdmin = {
  isAdmin: boolean;
};
