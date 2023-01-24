import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserInput, User } from './user.model';
import { User as DbUser, Prisma } from '@prisma/client';
import * as E from 'fp-ts/lib/Either';
import { USER_UPDATE_FAILED } from 'src/errors';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { stringToJson } from 'src/utils';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
  ) {}

  /**
   * Update a user's information
   * @param user User object
   * @param updateData Properties to update
   * @returns a Either of User or error
   */
  async updateUser(
    user: User,
    updateData: UpdateUserInput,
  ): Promise<E.Either<string, User>> {
    let { currentGQLSession, currentRESTSession, ...rest } = updateData;
    let updateUserObj: Partial<DbUser> = rest;

    // Convert stringified JSON to JSON
    if (updateData?.currentGQLSession !== undefined) {
      const jsonGql = stringToJson(updateData.currentGQLSession);
      if (E.isLeft<string>(jsonGql)) return jsonGql;

      updateUserObj.currentGQLSession = jsonGql?.right ?? Prisma.DbNull;
    }
    if (updateData?.currentRESTSession !== undefined) {
      const jsonRest = stringToJson(updateData.currentRESTSession);
      if (E.isLeft<string>(jsonRest)) return jsonRest;

      updateUserObj.currentRESTSession = jsonRest?.right ?? Prisma.DbNull;
    }

    // Update user
    try {
      const dbUpdatedUser = await this.prisma.user.update({
        where: { uid: user.uid },
        data: updateUserObj,
      });

      const updatedUser: User = {
        ...dbUpdatedUser,
        currentGQLSession: dbUpdatedUser.currentGQLSession
          ? JSON.stringify(dbUpdatedUser.currentGQLSession)
          : null,
        currentRESTSession: dbUpdatedUser.currentRESTSession
          ? JSON.stringify(dbUpdatedUser.currentRESTSession)
          : null,
      };

      // Publish subscription for user updates
      await this.pubsub.publish(`user/${updatedUser.uid}/updated`, updatedUser);

      return E.right(updatedUser);
    } catch (e) {
      return E.left(USER_UPDATE_FAILED);
    }
  }
}
