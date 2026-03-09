import {
  Args,
  ID,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import * as E from 'fp-ts/Either';
import { UseGuards } from '@nestjs/common';
import { Shortcode } from './shortcode.model';
import { ShortcodeService } from './shortcode.service';
import { throwErr } from 'src/utils';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { User } from 'src/user/user.model';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { AuthUser } from '../types/AuthUser';
import { PaginationArgs } from 'src/types/input-types.args';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => Shortcode)
export class ShortcodeResolver {
  constructor(
    private readonly shortcodeService: ShortcodeService,
    private readonly pubsub: PubSubService,
  ) {}

  /* Queries */
  @Query(() => Shortcode, {
    description: 'Resolves and returns a shortcode data',
    nullable: true,
  })
  async shortcode(
    @Args({
      name: 'code',
      type: () => ID,
      description: 'The shortcode to resolve',
    })
    code: string,
  ) {
    const result = await this.shortcodeService.getShortCode(code);

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Query(() => [Shortcode], {
    description: 'List all shortcodes the current user has generated',
  })
  @UseGuards(GqlAuthGuard)
  async myShortcodes(@GqlUser() user: AuthUser, @Args() args: PaginationArgs) {
    return this.shortcodeService.fetchUserShortCodes(user.uid, args);
  }

  /* Mutations */
  @Mutation(() => Shortcode, {
    description: 'Create a shortcode for the given request.',
  })
  @UseGuards(GqlAuthGuard)
  async createShortcode(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'request',
      description: 'JSON string of the request object',
    })
    request: string,
    @Args({
      name: 'properties',
      description: 'JSON string of the properties of the embed',
      nullable: true,
    })
    properties: string,
  ) {
    const result = await this.shortcodeService.createShortcode(
      request,
      properties,
      user,
    );

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Mutation(() => Shortcode, {
    description: 'Update a user generated Shortcode',
  })
  @UseGuards(GqlAuthGuard)
  async updateEmbedProperties(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'code',
      type: () => ID,
      description: 'The Shortcode to update',
    })
    code: string,
    @Args({
      name: 'properties',
      description: 'JSON string of the properties of the embed',
    })
    properties: string,
  ) {
    const result = await this.shortcodeService.updateEmbedProperties(
      code,
      user.uid,
      properties,
    );

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  @Mutation(() => Boolean, {
    description: 'Revoke a user generated shortcode',
  })
  @UseGuards(GqlAuthGuard)
  async revokeShortcode(
    @GqlUser() user: User,
    @Args({
      name: 'code',
      type: () => ID,
      description: 'The shortcode to remove',
    })
    code: string,
  ) {
    const result = await this.shortcodeService.revokeShortCode(code, user.uid);

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }

  /* Subscriptions */
  @Subscription(() => Shortcode, {
    description: 'Listen for shortcode creation',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  myShortcodesCreated(@GqlUser() user: AuthUser) {
    return this.pubsub.asyncIterator(`shortcode/${user.uid}/created`);
  }

  @Subscription(() => Shortcode, {
    description: 'Listen for Shortcode updates',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  myShortcodesUpdated(@GqlUser() user: AuthUser) {
    return this.pubsub.asyncIterator(`shortcode/${user.uid}/updated`);
  }

  @Subscription(() => Shortcode, {
    description: 'Listen for shortcode deletion',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  myShortcodesRevoked(@GqlUser() user: AuthUser): AsyncIterator<Shortcode> {
    return this.pubsub.asyncIterator(`shortcode/${user.uid}/revoked`);
  }
}
