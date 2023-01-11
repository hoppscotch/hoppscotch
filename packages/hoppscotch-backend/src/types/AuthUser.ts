export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image: string;
  isAdmin: boolean;
  refreshToken: string;
  createdOn: Date;
}
