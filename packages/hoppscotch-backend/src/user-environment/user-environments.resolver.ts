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
    description: 'Create a new personal user environment for given user uid',
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
  ): Promise<UserEnvironment> {
    const isGlobal = false;
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
    description: 'Create a new global user environment for given user uid',
  })
  @UseGuards(GqlAuthGuard)
  async createUserGlobalEnvironment(
    @GqlUser() user: User,
    @Args({
      name: 'variables',
      description: 'JSON string of the variables object',
    })
    variables: string,
  ): Promise<UserEnvironment> {
    const isGlobal = true;
    const userEnvironment =
      await this.userEnvironmentsService.createUserEnvironment(
        user.uid,
        null,
        variables,
        isGlobal,
      );
    if (E.isLeft(userEnvironment)) throwErr(userEnvironment.left);
    return userEnvironment.right;
  }

  @Mutation(() => UserEnvironment, {
    description: 'Updates a users personal or global environment',
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

  @Mutation(() => Boolean, {
    description: 'Deletes a users personal environment',
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
  ): Promise<boolean> {
    const userEnvironment =
      await this.userEnvironmentsService.deleteUserEnvironment(user.uid, id);
    if (E.isLeft(userEnvironment)) throwErr(userEnvironment.left);
    return userEnvironment.right;
  }

  @Mutation(() => Number, {
    description: 'Deletes all of users personal environments',
  })
  @UseGuards(GqlAuthGuard)
  async deleteUserEnvironments(@GqlUser() user: User): Promise<number> {
    return await this.userEnvironmentsService.deleteUserEnvironments(user.uid);
  }

  @Mutation(() => UserEnvironment, {
    description: 'Deletes all variables inside a users global environment',
  })
  @UseGuards(GqlAuthGuard)
  async clearGlobalEnvironments(
    @GqlUser() user: User,
    @Args({
      name: 'id',
      description: 'ID of the users global environment',
      type: () => ID,
    })
    id: string,
  ): Promise<UserEnvironment> {
    const userEnvironment =
      await this.userEnvironmentsService.clearGlobalEnvironments(user.uid, id);
    if (E.isLeft(userEnvironment)) throwErr(userEnvironment.left);
    return userEnvironment.right;
  }

  /* Subscriptions */

  @Subscription(() => UserEnvironment, {
    description: 'Listen for User Environment Creation',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userEnvironmentCreated(@GqlUser() user: User) {
    return this.pubsub.asyncIterator(`user_environment/${user.uid}/created`);
  }

  @Subscription(() => UserEnvironment, {
    description: 'Listen for User Environment updates',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userEnvironmentUpdated(
    @Args({
      name: 'id',
      description: 'Environment id',
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
      description: 'Environment id',
      type: () => ID,
    })
    id: string,
  ) {
    return this.pubsub.asyncIterator(`user_environment/${id}/deleted`);
  }

  @Subscription(() => Number, {
    description: 'Listen for User Environment DeleteMany',
    resolve: (value) => value,
  })
  @UseGuards(GqlAuthGuard)
  userEnvironmentDeleteMany(@GqlUser() user: User) {
    return this.pubsub.asyncIterator(
      `user_environment/${user.uid}/deleted_many`,
    );
  }
}
