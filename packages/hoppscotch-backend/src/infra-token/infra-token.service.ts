import { Injectable } from '@nestjs/common';
import { InfraToken as dbInfraToken } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInfraTokenResponse, InfraToken } from './infra-token.model';
import { calculateExpirationDate, isValidLength } from 'src/utils';
import { Admin } from 'src/admin/admin.model';
import {
  INFRA_TOKEN_CREATOR_NOT_FOUND,
  INFRA_TOKEN_EXPIRY_INVALID,
  INFRA_TOKEN_LABEL_SHORT,
  INFRA_TOKEN_NOT_FOUND,
} from 'src/errors';
import * as E from 'fp-ts/Either';
import { CreateUserInvitationRequest } from './request-response.dto';
import { AdminService } from 'src/admin/admin.service';

@Injectable()
export class InfraTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService,
  ) {}

  TITLE_LENGTH = 3;
  VALID_TOKEN_DURATIONS = [7, 30, 60, 90];

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
   * Typecast a database InfraToken to a InfraToken model
   * @param dbInfraToken database InfraToken
   * @returns InfraToken model
   */
  private cast(dbInfraToken: dbInfraToken): InfraToken {
    return {
      id: dbInfraToken.id,
      label: dbInfraToken.label,
      createdOn: dbInfraToken.createdOn,
      expiresOn: dbInfraToken.expiresOn,
      lastUsedOn: dbInfraToken.updatedOn,
    };
  }

  /**
   * Fetch all infra tokens with pagination
   * @param take take for pagination
   * @param skip skip for pagination
   * @returns List of InfraToken models
   */
  async getAll(take = 10, skip = 0) {
    const infraTokens = await this.prisma.infraToken.findMany({
      take,
      skip,
      orderBy: { createdOn: 'desc' },
    });

    return infraTokens.map((token) => this.cast(token));
  }

  /**
   * Create a new infra token
   * @param label label of the token
   * @param expiryInDays expiry duration of the token
   * @param admin admin who created the token
   * @returns Either of error message or CreateInfraTokenResponse
   */
  async create(label: string, expiryInDays: number, admin: Admin) {
    if (!isValidLength(label, this.TITLE_LENGTH)) {
      return E.left(INFRA_TOKEN_LABEL_SHORT);
    }

    if (!this.validateExpirationDate(expiryInDays ?? null)) {
      return E.left(INFRA_TOKEN_EXPIRY_INVALID);
    }

    const createdInfraToken = await this.prisma.infraToken.create({
      data: {
        creatorUid: admin.uid,
        label,
        expiresOn: calculateExpirationDate(expiryInDays ?? null) ?? undefined,
      },
    });

    const res: CreateInfraTokenResponse = {
      token: createdInfraToken.token,
      info: this.cast(createdInfraToken),
    };

    return E.right(res);
  }

  /**
   * Revoke an infra token
   * @param id ID of the infra token
   * @returns Either of error or true
   */
  async revoke(id: string) {
    try {
      await this.prisma.infraToken.delete({
        where: { id },
      });
    } catch (error) {
      return E.left(INFRA_TOKEN_NOT_FOUND);
    }
    return E.right(true);
  }

  /**
   * Update the last used on of an infra token
   * @param token token to update
   * @returns Either of error or InfraToken
   */
  async updateLastUsedOn(token: string) {
    try {
      const infraToken = await this.prisma.infraToken.update({
        where: { token },
        data: { updatedOn: new Date() },
      });
      return E.right(this.cast(infraToken));
    } catch (error) {
      return E.left(INFRA_TOKEN_NOT_FOUND);
    }
  }

  /**
   * Create a user invitation using an infra token
   * @param token token used to create the invitation
   * @param dto CreateUserInvitationRequest
   * @returns Either of error or InvitedUser
   */
  async createUserInvitation(token: string, dto: CreateUserInvitationRequest) {
    const infraToken = await this.prisma.infraToken.findUnique({
      where: { token },
    });

    const tokenCreator = await this.prisma.user.findUnique({
      where: { uid: infraToken.creatorUid },
    });
    if (!tokenCreator) return E.left(INFRA_TOKEN_CREATOR_NOT_FOUND);

    const invitedUser = await this.adminService.inviteUserToSignInViaEmail(
      tokenCreator.uid,
      tokenCreator.email,
      dto.inviteeEmail,
    );
    if (E.isLeft(invitedUser)) return E.left(invitedUser.left);

    return E.right(invitedUser);
  }
}
