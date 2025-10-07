export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING', 
  DISABLED = 'DISABLED',
  SUSPENDED = 'SUSPENDED'
}

export enum RegistrationMode {
  OPEN = 'OPEN',
  INVITATION_ONLY = 'INVITATION_ONLY', 
  DISABLED = 'DISABLED'
}

export type UserRegistrationSettings = {
  allowUserRegistration: boolean;
  registrationMode: RegistrationMode;
  requireAdminApproval: boolean;
  allowUserAccountDeletion: boolean;
  autoSelectLastInstance: boolean;
}