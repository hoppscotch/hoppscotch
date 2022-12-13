import { Injectable } from '@nestjs/common';

import { UserEnvironment } from './user-environments.model';
import { PrismaService } from '../prisma/prisma.service';
import { PubSubService } from '../pubsub/pubsub.service';
import * as E from 'fp-ts/Either';

enum SubscriptionType {
  Created = 'created',
  Updated = 'updated',
  Deleted = 'deleted',
}

@Injectable()
export class UserEnvironmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
  ) {}

  /**
   * Fetch personal and global user environments based on `isGlobal` flag
   * @param uid Users uid
   * @returns array of users personal and global environments
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
   * Create a personal or global user environment
   * @param uid Users uid
   * @param name environments name
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
    if (isGlobal) {
      const globalEnvExists = await this.checkForExistingGlobalEnv(uid);
      if (E.isRight(globalEnvExists)) return E.left('global env exits');
    }

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
    await this.publishUserEnvironmentCreatedSubscription(
      userEnvironment,
      SubscriptionType.Created,
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
      // Publish subscription for environment creation
      await this.publishUserEnvironmentCreatedSubscription(
        updatedUserEnvironment,
        SubscriptionType.Updated,
      );
      return E.right(updatedUserEnvironment);
    } catch (e) {
      return E.left('user_env not found');
    }
  }

  /**
   * Delete an existing personal user environment based on environment id
   * @param id environment id
   * @returns an Either of deleted `UserEnvironment` or error
   */
  async deleteUserEnvironment(id: string) {
    try {
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
      // Publish subscription for environment creation
      await this.publishUserEnvironmentCreatedSubscription(
        deletedUserEnvironment,
        SubscriptionType.Deleted,
      );
      return E.right(deletedUserEnvironment);
    } catch (e) {
      return E.left('user_env not found');
    }
  }

  /**
   * Deletes all existing personal user environments
   * @param id environment id
   * @param isGlobal flag to indicate type of environment to delete
   * @returns a count of environments deleted
   */
  async deleteUserEnvironments(uid: string) {
    const deletedEnvironments = await this.prisma.userEnvironment.deleteMany({
      where: {
        userUid: uid,
        isGlobal: false,
      },
    });
    return deletedEnvironments.count;
  }

  async deleteAllVariablesFromUsersGlobalEnvironment(uid: string, id: string) {
    const globalEnvExists = await this.checkForExistingGlobalEnv(uid);
    if (E.isRight(globalEnvExists) && !E.isLeft(globalEnvExists)) {
      const env = globalEnvExists.right;
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
          // Publish subscription for environment creation
          await this.publishUserEnvironmentCreatedSubscription(
            updatedUserEnvironment,
            SubscriptionType.Updated,
          );
          return E.right(updatedUserEnvironment);
        } catch (e) {
          return E.left('user_env not found');
        }
      }
    }
    return E.left('mismatch');
  }

  // Method to publish subscriptions based on the subscription type of the environment
  async publishUserEnvironmentCreatedSubscription(
    userEnv: UserEnvironment,
    subscriptionType: SubscriptionType,
  ) {
    switch (subscriptionType) {
      case SubscriptionType.Created:
        await this.pubsub.publish(
          `user_environment/${userEnv.userUid}/created`,
          userEnv,
        );
        break;
      case SubscriptionType.Updated:
        await this.pubsub.publish(
          `user_environment/${userEnv.id}/updated`,
          userEnv,
        );
        break;
      case SubscriptionType.Deleted:
        await this.pubsub.publish(
          `user_environment/${userEnv.id}/deleted`,
          userEnv,
        );
        break;
      default:
        break;
    }
  }

  private async checkForExistingGlobalEnv(uid: string) {
    const globalEnv = await this.prisma.userEnvironment.findFirst({
      where: {
        userUid: uid,
        isGlobal: true,
      },
    });
    if (globalEnv === null) return E.left('global env not exist');

    return E.right(globalEnv);
  }

  async fetchUserGlobalEnvironments(uid: string) {
    const globalEnvironment = await this.prisma.userEnvironment.findFirst({
      where: {
        userUid: uid,
        isGlobal: true,
      },
      rejectOnNotFound: true,
    });

    return <UserEnvironment>{
      userUid: globalEnvironment.userUid,
      id: globalEnvironment.id,
      name: globalEnvironment.name,
      variables: JSON.stringify(globalEnvironment.variables),
      isGlobal: globalEnvironment.isGlobal,
    };
  }
}
