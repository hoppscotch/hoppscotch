import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SessionType, User } from './user.model';
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
   * Update a user's sessions
   * @param user User object
   * @param currentRESTSession user's current REST session
   * @param currentGQLSession user's current GQL session
   * @returns a Either of User or error
   */
  async updateUserSessions(
    user: User,
    currentSession: string,
    sessionType: string,
  ): Promise<E.Right<User> | E.Left<string>> {
    const validatedSession = await this.validateSession(currentSession);
    if (E.isLeft(validatedSession)) return E.left(validatedSession.left);

    try {
      const sessionObj = {};
      switch (sessionType) {
        case SessionType.GQL:
          sessionObj['currentGQLSession'] = validatedSession.right;
          break;
        case SessionType.REST:
          sessionObj['currentRESTSession'] = validatedSession.right;
          break;
        default:
          return E.left(USER_UPDATE_FAILED);
      }

      const dbUpdatedUser = await this.prisma.user.update({
        where: { uid: user.uid },
        data: sessionObj,
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

  /**
   * Validate and parse currentRESTSession and currentGQLSession
   * @param sessionData string of the session
   * @returns a Either of JSON object or error
   */
  async validateSession(sessionData: string) {
    const jsonSession = stringToJson(sessionData);
    if (E.isLeft(jsonSession)) return E.left(jsonSession.left);

    return E.right(jsonSession.right);
  }
}
