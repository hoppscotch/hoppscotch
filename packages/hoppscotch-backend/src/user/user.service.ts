import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { AuthUser } from 'src/types/AuthUser';
import { USER_NOT_FOUND } from 'src/errors';

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
          uid: userUid,
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
        displayName: !profile.displayName ? null : profile.displayName,
        email: profile.emails[0].value,
        photoURL: !profile.photos ? null : profile.photos[0].value,
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

  async createProviderAccount(
    user: AuthUser,
    accessToken: string,
    refreshToken: string,
    profile,
  ) {
    const createdProvider = await this.prisma.account.create({
      data: {
        provider: profile.provider,
        providerAccountId: profile.id,
        providerRefreshToken: refreshToken ? refreshToken : null,
        providerAccessToken: accessToken ? accessToken : null,
        user: {
          connect: {
            uid: user.uid,
          },
        },
      },
    });

    return createdProvider;
  }

  async updateUserDetails(user: AuthUser, profile) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: {
          uid: user.uid,
        },
        data: {
          displayName: !profile.displayName ? null : profile.displayName,
          photoURL: !profile.photos ? null : profile.photos[0].value,
        },
      });
      return E.right(updatedUser);
    } catch (error) {
      return E.left(USER_NOT_FOUND);
    }
  }
}
