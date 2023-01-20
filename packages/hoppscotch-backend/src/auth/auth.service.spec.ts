import { JwtService } from '@nestjs/jwt';
import { mockDeep } from 'jest-mock-extended';
import { MailerService } from 'src/mailer/mailer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUser } from 'src/types/AuthUser';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';

const mockPrisma = mockDeep<PrismaService>();
const mockUser = mockDeep<UserService>();
const mockJWT = mockDeep<JwtService>();
const mockMailer = mockDeep<MailerService>();

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const authService = new AuthService(mockUser, mockPrisma, mockJWT, mockMailer);

const currentTime = new Date();

const user: AuthUser = {
  uid: '123344',
  email: 'dwight@dundermifflin.com',
  displayName: 'Dwight Schrute',
  photoURL: 'https://en.wikipedia.org/wiki/Dwight_Schrute',
  isAdmin: false,
  refreshToken: 'hbfvdkhjbvkdvdfjvbnkhjb',
  createdOn: currentTime,
};

describe('signIn', () => {
  // should throw error if email is not in valid format
  // should successfully create a new user account and return the passwordless details
  // should successfully return the passwordless details for a existing user account
  
});
