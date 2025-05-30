import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAccessTokenDto } from './dto/create-access-token.dto';
import { AuthUser } from 'src/types/AuthUser';
import { calculateExpirationDate, isValidLength } from 'src/utils';
import * as E from 'fp-ts/Either';
import {
  ACCESS_TOKEN_EXPIRY_INVALID,
  ACCESS_TOKEN_LABEL_SHORT,
  ACCESS_TOKEN_NOT_FOUND,
} from 'src/errors';
import { CreateAccessTokenResponse } from './helper';
import { PersonalAccessToken } from '@prisma/client';
import { AccessToken } from 'src/types/AccessToken';

@Injectable()
export class AccessTokenService {
  constructor(private readonly prisma: PrismaService) {}

  TITLE_LENGTH = 3;
  VALID_TOKEN_DURATIONS = [7, 30, 60, 90];
  TOKEN_PREFIX = 'pat-';

  /**
   * Validate the expiration date of the token
   *
   * @param expiresOn Number of days the token is valid for
   * @returns Boolean indicating if the expiration date is valid
   */
  private validateExpirationDate(expiresOn: null | number) {
    if (expiresOn === null || this.VALID_TOKEN_DURATIONS.includes(expiresOn))
      return true;
    return false;
  }

  /**
   * Typecast a database PersonalAccessToken to a AccessToken model
   * @param token database PersonalAccessToken
   * @returns AccessToken model
   */
  private cast(token: PersonalAccessToken): AccessToken {
    return <AccessToken>{
      id: token.id,
      label: token.label,
      createdOn: token.createdOn,
      expiresOn: token.expiresOn,
      lastUsedOn: token.updatedOn,
    };
  }

  /**
   * Extract UUID from the token
   *
   * @param token Personal Access Token
   * @returns UUID of the token
   */
  private extractUUID(token): string | null {
    if (!token.startsWith(this.TOKEN_PREFIX)) return null;
    return token.slice(this.TOKEN_PREFIX.length);
  }

  /**
   * Create a Personal Access Token
   *
   * @param createAccessTokenDto DTO for creating a Personal Access Token
   * @param user AuthUser object
   * @returns Either of the created token or error message
   */
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
        expiresOn: calculateExpirationDate(createAccessTokenDto.expiryInDays),
      },
    });

    const res: CreateAccessTokenResponse = {
      token: `${this.TOKEN_PREFIX}${createdPAT.token}`,
      info: this.cast(createdPAT),
    };

    return E.right(res);
  }

  /**
   * Delete a Personal Access Token
   *
   * @param accessTokenID ID of the Personal Access Token
   * @returns Either of true or error message
   */
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

  /**
   * List all Personal Access Tokens of a user
   *
   * @param userUid UID of the user
   * @param offset Offset for pagination
   * @param limit Limit for pagination
   * @returns Either of the list of Personal Access Tokens or error message
   */
  async listAllUserPAT(userUid: string, offset: number, limit: number) {
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

    return userAccessTokenList;
  }

  /**
   * Get a Personal Access Token
   *
   * @param accessToken Personal Access Token
   * @returns Either of the Personal Access Token or error message
   */
  async getUserPAT(accessToken: string) {
    const extractedToken = this.extractUUID(accessToken);
    if (!extractedToken) return E.left(ACCESS_TOKEN_NOT_FOUND);

    try {
      const userPAT = await this.prisma.personalAccessToken.findUniqueOrThrow({
        where: { token: extractedToken },
        include: { user: true },
      });
      return E.right(userPAT);
    } catch {
      return E.left(ACCESS_TOKEN_NOT_FOUND);
    }
  }

  /**
   * Update the last used date of a Personal Access Token
   *
   * @param token Personal Access Token
   * @returns Either of the updated Personal Access Token or error message
   */
  async updateLastUsedForPAT(token: string) {
    const extractedToken = this.extractUUID(token);
    if (!extractedToken) return E.left(ACCESS_TOKEN_NOT_FOUND);

    try {
      const updatedAccessToken = await this.prisma.personalAccessToken.update({
        where: { token: extractedToken },
        data: {
          updatedOn: new Date(),
        },
      });

      return E.right(this.cast(updatedAccessToken));
    } catch {
      return E.left(ACCESS_TOKEN_NOT_FOUND);
    }
  }
}
