import { Args, ID, Mutation, Resolver, Subscription } from '@nestjs/graphql';
import { PubSubService } from '../pubsub/pubsub.service';
import { UserEnvironment } from './user-environments.model';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlUser } from '../decorators/gql-user.decorator';
import { User } from '../user/user.model';
import { UserEnvironmentsService } from './user-environments.service';
import * as E from 'fp-ts/Either';
import { throwErr } from 'src/utils';

@Resolver()
export class UserEnvironmentsResolver {
  constructor(
    private readonly userEnvironmentsService: UserEnvironmentsService,
    private readonly pubsub: PubSubService,
  ) {}

  /* Mutations */

  @Mutation(() => UserEnvironment, {
    description:
      'Create a new personal or global user environment for given user uid',
  })
  @UseGuards(GqlAuthGuard)
  async createUserEnvironment(
    @GqlUser() user: User,
    @Args({
      name: 'name',
      description:
        'Name of the User Environment, if global send an empty string',
    })
    name: string,
    @Args({
      name: 'variables',
      description: 'JSON string of the variables object',
    })
    variables: string,
    @Args({
      name: 'isGlobal',
      description: 'isGlobal flag to indicate personal or global environment',
    })
    isGlobal: boolean,
  ): Promise<UserEnvironment> {
    const userEnvironment =
      await this.userEnvironmentsService.createUserEnvironment(
        user.uid,
        name,
        variables,
        isGlobal,
      );
    if (E.isLeft(userEnvironment)) throwErr(userEnvironment.left);
    return userEnvironment.right;
  }

  @Mutation(() => UserEnvironment, {
    description:
      'Update a users personal or global environment based on environment id',
  })
  @UseGuards(GqlAuthGuard)
  async updateUserEnvironment(
    @Args({
      name: 'id',
      description: 'ID of the user environment',
      type: () => ID,
    })
    id: string,
    @Args({
      name: 'name',
      description:
        'Name of the User Environment, if global send an empty string',
    })
    name: string,
    @Args({
      name: 'variables',
      description: 'JSON string of the variables object',
    })
    variables: string,
  ): Promise<UserEnvironment> {
    const userEnvironment =
      await this.userEnvironmentsService.updateUserEnvironment(
        id,
        name,
        variables,
      );
    if (E.isLeft(userEnvironment)) throwErr(userEnvironment.left);
    return userEnvironment.right;
  }

  @Mutation(() => UserEnvironment, {
    description: 'Deletes a users personal environment based on environment id',
  })
  @UseGuards(GqlAuthGuard)
  async deleteUserEnvironment(
    @GqlUser() user: User,
    @Args({
      name: 'id',
      description: 'ID of the user environment',
      type: () => ID,
    })
    id: string,
  ): Promise<UserEnvironment> {
    const userEnvironment =
      await this.userEnvironmentsService.deleteUserEnvironment(user.uid, id);
    if (E.isLeft(userEnvironment)) throwErr(userEnvironment.left);
    return userEnvironment.right;
  }

  @Mutation(() => Number, {
    description: 'Deletes users all personal environments',
  })
  @UseGuards(GqlAuthGuard)
  async deleteUserEnvironments(@GqlUser() user: User): Promise<number> {
    return await this.userEnvironmentsService.deleteUserEnvironments(user.uid);
  }

  @Mutation(() => UserEnvironment, {
    description: 'Deletes all variables inside a users global environment',
  })
  @UseGuards(GqlAuthGuard)
  async deleteAllVariablesFromUsersGlobalEnvironment(
    @GqlUser() user: User,
    @Args({
      name: 'id',
      description: 'ID of the users global environment',
      type: () => ID,
    })
    id: string,
  ): Promise<UserEnvironment> {
    const userEnvironment =
      await this.userEnvironmentsService.deleteAllVariablesFromUsersGlobalEnvironment(
        user.uid,
        id,
      );
    if (E.isLeft(userEnvironment)) throwErr(userEnvironment.left);
    return userEnvironment.right;
  }

  /* Subscriptions */

  @Subscription(() => UserEnvironment, {
    description: 'Listen for User Environment Creation',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userEnvironmentCreated(
    @Args({
      name: 'userUid',
      description: 'users uid',
      type: () => ID,
    })
    userUid: string,
  ) {
    return this.pubsub.asyncIterator(`user_environment/${userUid}/created`);
  }

  @Subscription(() => UserEnvironment, {
    description: 'Listen for User Environment updates',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userEnvironmentUpdated(
    @Args({
      name: 'id',
      description: 'environment id',
      type: () => ID,
    })
    id: string,
  ) {
    return this.pubsub.asyncIterator(`user_environment/${id}/updated`);
  }

  @Subscription(() => UserEnvironment, {
    description: 'Listen for User Environment deletion',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userEnvironmentDeleted(
    @Args({
      name: 'id',
      description: 'environment id',
      type: () => ID,
    })
    id: string,
  ) {
    return this.pubsub.asyncIterator(`user_environment/${id}/deleted`);
  }
}
