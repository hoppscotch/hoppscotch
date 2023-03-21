import {
  Args,
  Context,
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
import { UserService } from 'src/user/user.service';
import { throwErr } from 'src/utils';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { User } from 'src/user/user.model';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { AuthUser } from '../types/AuthUser';
import { JwtService } from '@nestjs/jwt';
import { PaginationArgs } from 'src/types/input-types.args';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { SkipThrottle } from '@nestjs/throttler';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => Shortcode)
export class ShortcodeResolver {
  constructor(
    private readonly shortcodeService: ShortcodeService,
    private readonly userService: UserService,
    private readonly pubsub: PubSubService,
    private jwtService: JwtService,
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
  async createShortcode(
    @Args({
      name: 'request',
      description: 'JSON string of the request object',
    })
    request: string,
    @Context() ctx: any,
  ) {
    const decodedAccessToken = this.jwtService.verify(
      ctx.req.cookies['access_token'],
    );
    const result = await this.shortcodeService.createShortcode(
      request,
      decodedAccessToken?.sub,
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
      description: 'The shortcode to resolve',
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
    description: 'Listen for shortcode deletion',
    resolve: (value) => value,
  })
  @SkipThrottle()
  @UseGuards(GqlAuthGuard)
  myShortcodesRevoked(@GqlUser() user: AuthUser): AsyncIterator<Shortcode> {
    return this.pubsub.asyncIterator(`shortcode/${user.uid}/revoked`);
  }
}
