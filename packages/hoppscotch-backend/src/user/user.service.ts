import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as O from 'fp-ts/Option';
import { User } from './user.model';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    try {
      const user: User = await this.prisma.user.findUniqueOrThrow({
        where: {
          email: email,
        },
      });
      return O.some(user);
    } catch (error) {
      return O.none;
    }
  }

  async createUser(email: string) {
    const createdUser = await this.prisma.user.create({
      data: {
        email: email,
        accounts: {
          create: {
            provider: 'magic',
            providerAccountId: email,
          },
        },
      },
    });

    return createdUser;
  }

  async createUserSSO(accessToken, refreshToken, profile) {
    const createdUser = await this.prisma.user.create({
      data: {
        name: profile.displayName,
        email: profile.emails[0].value,
        image: profile.photos[0].value,
        accounts: {
          create: {
            provider: profile.provider,
            providerAccountId: profile.id,
            providerRefreshToken: refreshToken,
            providerAccessToken: accessToken,
          },
        },
      },
    });

    return createdUser;
  }

  async createProviderAccount(user, accessToken, refreshToken, profile) {
    const createdProvider = await this.prisma.account.create({
      data: {
        userId: user.id,
        provider: profile.provider,
        providerAccountId: profile.id,
        providerRefreshToken: refreshToken ? refreshToken : null,
        providerAccessToken: accessToken ? accessToken : null,
      },
    });

    return createdProvider;
  }
}
