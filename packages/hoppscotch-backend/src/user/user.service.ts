import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as O from 'fp-ts/Option';
import { AuthUser, SSOProviderProfile } from 'src/types/AuthUser';
import { checkNullability } from 'src/utils';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: {
          email: email,
        },
      });
      return O.some(user);
    } catch (error) {
      return O.none;
    }
  }

  async findUserById(userUid: string) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: {
          id: userUid,
        },
      });
      return O.some(user);
    } catch (error) {
      return O.none;
    }
  }

  async createUserMagic(email: string) {
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

  async createUserSSO(accessToken: string, refreshToken: string, profile) {
    const createdUser = await this.prisma.user.create({
      data: {
        name: !profile.displayName ? null : profile.displayName,
        email: profile.emails[0].value,
        image: !profile.photos ? null : profile.photos[0].value,
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
        provider: profile.provider,
        providerAccountId: profile.id,
        providerRefreshToken: refreshToken ? refreshToken : null,
        providerAccessToken: accessToken ? accessToken : null,
        user: {
          connect: {
            id: user.id,
          },
        },
      },
    });

    return createdProvider;
  }
}
