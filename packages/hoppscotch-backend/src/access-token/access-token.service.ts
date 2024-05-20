import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAccessTokenDto } from './dto/create-access-token.dto';
import { AuthUser } from 'src/types/AuthUser';
import { isValidLength } from 'src/utils';
import * as E from 'fp-ts/Either';
import {
  ACCESS_TOKENS_NOT_FOUND,
  ACCESS_TOKEN_EXPIRY_INVALID,
  ACCESS_TOKEN_LABEL_SHORT,
  ACCESS_TOKEN_NOT_FOUND,
} from 'src/errors';
import { CreateAccessTokenResponse } from './helper';
import { PersonalAccessToken } from '@prisma/client';
import { AccessToken } from 'src/types/AccessToken';
import { Request } from 'express';
@Injectable()
export class AccessTokenService {
  constructor(private readonly prisma: PrismaService) {}

  TITLE_LENGTH = 3;
  VALID_TOKEN_DURATIONS = [7, 30, 60, 90];
  TOKEN_PREFIX = 'pat';

  private calculateExpirationDate(expiresOn: null | number) {
    if (expiresOn === null) return null;
    return new Date(Date.now() + expiresOn * 24 * 60 * 60 * 1000);
  }

  private validateExpirationDate(expiresOn: null | number) {
    if (expiresOn === null || this.VALID_TOKEN_DURATIONS.includes(expiresOn))
      return true;
    return false;
  }

  private cast(token: PersonalAccessToken): AccessToken {
    return <AccessToken>{
      id: token.id,
      label: token.label,
      createdOn: token.createdOn,
      expiresOn: token.expiresOn,
      lastUsedOn: token.updatedOn,
    };
  }

  async createPAT(createAccessTokenDto: CreateAccessTokenDto, user: AuthUser) {
    const isTitleValid = isValidLength(
      createAccessTokenDto.label,
      this.TITLE_LENGTH,
    );
    if (!isTitleValid)
      return E.left({
        message: ACCESS_TOKEN_LABEL_SHORT,
        statusCode: HttpStatus.BAD_REQUEST,
      });

    if (!this.validateExpirationDate(createAccessTokenDto.expiryInDays))
      return E.left({
        message: ACCESS_TOKEN_EXPIRY_INVALID,
        statusCode: HttpStatus.BAD_REQUEST,
      });

    const createdPAT = await this.prisma.personalAccessToken.create({
      data: {
        userUid: user.uid,
        label: createAccessTokenDto.label,
        expiresOn: this.calculateExpirationDate(
          createAccessTokenDto.expiryInDays,
        ),
      },
    });

    const res: CreateAccessTokenResponse = {
      token: `${this.TOKEN_PREFIX}-${createdPAT.token}`,
      info: this.cast(createdPAT),
    };

    return E.right(res);
  }

  async deletePAT(accessTokenID: string) {
    try {
      await this.prisma.personalAccessToken.delete({
        where: { id: accessTokenID },
      });
      return E.right(true);
    } catch {
      return E.left({
        message: ACCESS_TOKEN_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
  }

  async listAllUserPAT(userUid: string, offset: number, limit: number) {
    try {
      const userPATs = await this.prisma.personalAccessToken.findMany({
        where: {
          userUid: userUid,
        },
        skip: offset,
        take: limit,
        orderBy: {
          createdOn: 'desc',
        },
      });

      const userAccessTokenList = userPATs.map((pat) => this.cast(pat));

      return E.right(userAccessTokenList);
    } catch {
      return E.left({
        message: ACCESS_TOKENS_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
  }

  async getUserPAT(accessToken: string) {
    try {
      const userPAT = await this.prisma.personalAccessToken.findUniqueOrThrow({
        where: { token: accessToken },
      });
      return E.right(this.cast(userPAT));
    } catch {
      return E.left(ACCESS_TOKEN_NOT_FOUND);
    }
  }

  async updateLastUsedforPAT(token: string) {
    console.log('Before...dcsc', token);
    // try {
    //   await this.prisma.personalAccessToken.update({
    //     where: { token },
    //     data: {
    //       updatedOn: new Date(),
    //     },
    //   });
    // } catch {
    //   return E.left(ACCESS_TOKEN_NOT_FOUND);
    // }
  }
}
