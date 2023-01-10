import { User } from 'src/user/user.model';

export interface PasswordlessToken {
  deviceIdentifier: string;
  token: string;
  userUid: string;
  user?: User;
  expiresOn: Date;
}

export interface DeviceIdentifierToken {
  deviceIdentifier: string;
}
