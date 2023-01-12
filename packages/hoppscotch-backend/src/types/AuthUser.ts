import { User } from '@prisma/client';

export type AuthUser = User;

export interface SSOProviderProfile {
  provider: string;
  id: string;
}
