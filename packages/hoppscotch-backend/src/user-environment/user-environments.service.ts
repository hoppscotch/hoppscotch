import { Injectable } from '@nestjs/common';
import { UserEnvironment } from './user-environments.model';
import { PrismaService } from '../prisma/prisma.service';
import { PubSubService } from '../pubsub/pubsub.service';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import {
  USER_ENVIRONMENT_ENV_DOES_NOT_EXISTS,
  USER_ENVIRONMENT_GLOBAL_ENV_DOES_NOT_EXISTS,
  USER_ENVIRONMENT_GLOBAL_ENV_DELETION_FAILED,
  USER_ENVIRONMENT_GLOBAL_ENV_EXISTS,
  USER_ENVIRONMENT_IS_NOT_GLOBAL,
  USER_ENVIRONMENT_UPDATE_FAILED,
  USER_ENVIRONMENT_INVALID_ENVIRONMENT_NAME,
} from '../errors';
import { SubscriptionHandler } from '../subscription-handler';

// Contains constants for the subscription types we send to subscription handler
enum SubscriptionType {
  Created = 'created',
  Updated = 'updated',
  Deleted = 'deleted',
  DeleteMany = 'delete_many',
}

@Injectable()
export class UserEnvironmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
    private readonly subscriptionHandler: SubscriptionHandler,
  ) {}

  /**
   * Fetch personal user environments
   * @param uid Users uid
   * @returns array of users personal environments
   */
  async fetchUserEnvironments(uid: string) {
    const environments = await this.prisma.userEnvironment.findMany({
      where: {
        userUid: uid,
        isGlobal: false,
      },
    });

    const userEnvironments: UserEnvironment[] = [];
    environments.forEach((environment) => {
      userEnvironments.push(<UserEnvironment>{
        userUid: environment.userUid,
        id: environment.id,
        name: environment.name,
        variables: JSON.stringify(environment.variables),
        isGlobal: environment.isGlobal,
      });
    });
    return userEnvironments;
  }

  /**
   * Fetch users global environment
   * @param uid Users uid
   * @returns an `UserEnvironment` object
   */
  async fetchUserGlobalEnvironment(uid: string) {
    const globalEnvironment = await this.prisma.userEnvironment.findFirst({
      where: {
        userUid: uid,
        isGlobal: true,
      },
    });

    if (globalEnvironment != null) {
      return E.right(<UserEnvironment>{
        userUid: globalEnvironment.userUid,
        id: globalEnvironment.id,
        name: globalEnvironment.name,
        variables: JSON.stringify(globalEnvironment.variables),
        isGlobal: globalEnvironment.isGlobal,
      });
    }

    return E.left(USER_ENVIRONMENT_ENV_DOES_NOT_EXISTS);
  }

  /**
   * Create a personal or global user environment
   * @param uid Users uid
   * @param name environments name, null if the environment is global
   * @param variables environment variables
   * @param isGlobal flag to indicate type of environment to create
   * @returns an `UserEnvironment` object
   */
  async createUserEnvironment(
    uid: string,
    name: string,
    variables: string,
    isGlobal: boolean,
  ) {
    // Check for existing global env for a user if exists error out to avoid recreation
    if (isGlobal) {
      const globalEnvExists = await this.checkForExistingGlobalEnv(uid);
      if (!O.isNone(globalEnvExists))
        return E.left(USER_ENVIRONMENT_GLOBAL_ENV_EXISTS);
    }
    if (name === null && !isGlobal)
      return E.left(USER_ENVIRONMENT_INVALID_ENVIRONMENT_NAME);

    const createdEnvironment = await this.prisma.userEnvironment.create({
      data: {
        userUid: uid,
        name: name,
        variables: JSON.parse(variables),
        isGlobal: isGlobal,
      },
    });

    const userEnvironment: UserEnvironment = {
      userUid: createdEnvironment.userUid,
      id: createdEnvironment.id,
      name: createdEnvironment.name,
      variables: JSON.stringify(createdEnvironment.variables),
      isGlobal: createdEnvironment.isGlobal,
    };
    // Publish subscription for environment creation
    await this.subscriptionHandler.publish(
      `user_environment/${userEnvironment.userUid}`,
      SubscriptionType.Created,
      userEnvironment,
    );
    return E.right(userEnvironment);
  }

  /**
   * Update an existing personal or global user environment
   * @param id environment id
   * @param name environments name
   * @param variables environment variables
   * @returns an Either of `UserEnvironment` or error
   */
  async updateUserEnvironment(id: string, name: string, variables: string) {
    try {
      const updatedEnvironment = await this.prisma.userEnvironment.update({
        where: { id: id },
        data: {
          name: name,
          variables: JSON.parse(variables),
        },
      });

      const updatedUserEnvironment: UserEnvironment = {
        userUid: updatedEnvironment.userUid,
        id: updatedEnvironment.id,
        name: updatedEnvironment.name,
        variables: JSON.stringify(updatedEnvironment.variables),
        isGlobal: updatedEnvironment.isGlobal,
      };
      // Publish subscription for environment update
      await this.subscriptionHandler.publish(
        `user_environment/${updatedUserEnvironment.id}`,
        SubscriptionType.Updated,
        updatedUserEnvironment,
      );
      return E.right(updatedUserEnvironment);
    } catch (e) {
      return E.left(USER_ENVIRONMENT_ENV_DOES_NOT_EXISTS);
    }
  }

  /**
   * Delete an existing personal user environment based on environment id
   * @param uid users uid
   * @param id environment id
   * @returns an Either of deleted `UserEnvironment` or error
   */
  async deleteUserEnvironment(uid: string, id: string) {
    try {
      // check if id is of a global environment if it is, don't delete and error out
      const globalEnvExists = await this.checkForExistingGlobalEnv(uid);
      if (O.isSome(globalEnvExists)) {
        const globalEnv = globalEnvExists.value;
        if (globalEnv.id === id) {
          return E.left(USER_ENVIRONMENT_GLOBAL_ENV_DELETION_FAILED);
        }
      }
      const deletedEnvironment = await this.prisma.userEnvironment.delete({
        where: {
          id: id,
        },
      });

      const deletedUserEnvironment: UserEnvironment = {
        userUid: deletedEnvironment.userUid,
        id: deletedEnvironment.id,
        name: deletedEnvironment.name,
        variables: JSON.stringify(deletedEnvironment.variables),
        isGlobal: deletedEnvironment.isGlobal,
      };

      // Publish subscription for environment deletion
      await this.subscriptionHandler.publish(
        `user_environment/${deletedUserEnvironment.id}`,
        SubscriptionType.Deleted,
        deletedUserEnvironment,
      );
      return E.right(true);
    } catch (e) {
      return E.left(USER_ENVIRONMENT_ENV_DOES_NOT_EXISTS);
    }
  }

  /**
   * Deletes all existing personal user environments
   * @param uid user uid
   * @returns a count of environments deleted
   */
  async deleteUserEnvironments(uid: string) {
    const deletedEnvironments = await this.prisma.userEnvironment.deleteMany({
      where: {
        userUid: uid,
        isGlobal: false,
      },
    });

    await this.subscriptionHandler.publish(
      `user_environment/${uid}`,
      SubscriptionType.DeleteMany,
      deletedEnvironments.count,
    );
  }

  /**
   * Removes all existing variables in a users global environment
   * @param uid users uid
   * @param id environment id
   * @returns an `` of environments deleted
   */
  async clearGlobalEnvironments(uid: string, id: string) {
    const globalEnvExists = await this.checkForExistingGlobalEnv(uid);
    if (O.isNone(globalEnvExists))
      return E.left(USER_ENVIRONMENT_GLOBAL_ENV_DOES_NOT_EXISTS);

    const env = globalEnvExists.value;
    if (env.id === id) {
      try {
        const updatedEnvironment = await this.prisma.userEnvironment.update({
          where: { id: id },
          data: {
            variables: [],
          },
        });
        const updatedUserEnvironment: UserEnvironment = {
          userUid: updatedEnvironment.userUid,
          id: updatedEnvironment.id,
          name: updatedEnvironment.name,
          variables: JSON.stringify(updatedEnvironment.variables),
          isGlobal: updatedEnvironment.isGlobal,
        };

        // Publish subscription for environment update
        await this.subscriptionHandler.publish(
          `user_environment/${updatedUserEnvironment.id}`,
          SubscriptionType.Updated,
          updatedUserEnvironment,
        );
        return E.right(updatedUserEnvironment);
      } catch (e) {
        return E.left(USER_ENVIRONMENT_UPDATE_FAILED);
      }
    } else return E.left(USER_ENVIRONMENT_IS_NOT_GLOBAL);
  }

  // Method to check for existing global environments for a given user uid
  private async checkForExistingGlobalEnv(uid: string) {
    const globalEnv = await this.prisma.userEnvironment.findFirst({
      where: {
        userUid: uid,
        isGlobal: true,
      },
    });

    if (globalEnv == null) return O.none;
    return O.some(globalEnv);
  }
}
