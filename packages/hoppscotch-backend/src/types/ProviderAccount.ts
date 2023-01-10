import { User } from 'src/user/user.model';

export interface ProviderAccount {
  id: string;
  userId: string;
  user?: User;
  provider: string;
  providerAccountId: string;
  providerRefreshToken?: string;
  providerAccessToken?: string;
  providerScope?: string;
  loggedIn: Date;
}
