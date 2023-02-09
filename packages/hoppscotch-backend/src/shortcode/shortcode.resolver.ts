import {
  Args,
  Context,
  ID,
  Mutation,
  Query,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as T from 'fp-ts/Task';
import * as TO from 'fp-ts/TaskOption';
import * as TE from 'fp-ts/TaskEither';
import { UseGuards } from '@nestjs/common';

import { Shortcode } from './shortcode.model';
import { ShortcodeService } from './shortcode.service';
import { UserService } from 'src/user/user.service';
import { throwErr } from 'src/utils';
import { SHORTCODE_INVALID_JSON } from 'src/errors';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { User } from 'src/user/user.model';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { AuthUser } from '../types/AuthUser';

@Resolver(() => Shortcode)
export class ShortcodeResolver {
  constructor(
    private readonly shortcodeService: ShortcodeService,
    private readonly userService: UserService,
    private readonly pubsub: PubSubService,
  ) {}

  /* Queries */

  @Query(() => Shortcode, {
    description: 'Resolves and returns a shortcode data',
    nullable: true,
  })
  shortcode(
    @Args({
      name: 'code',
      type: () => ID,
      description: 'The shortcode to resolve',
    })
    code: string,
  ): Promise<Shortcode | null> {
    return pipe(
      this.shortcodeService.resolveShortcode(code),
      TO.getOrElseW(() => T.of(null)),
    )();
  }

  @Query(() => [Shortcode], {
    description: 'List all shortcodes the current user has generated',
  })
  @UseGuards(GqlAuthGuard)
  myShortcodes(
    @GqlUser() user: AuthUser,
    @Args({
      name: 'cursor',
      type: () => ID,
      description:
        'The ID of the last returned shortcode (used for pagination)',
      nullable: true,
    })
    cursor?: string,
  ): Promise<Shortcode[]> {
    return this.shortcodeService.fetchUserShortCodes(
      user.uid,
      cursor ?? null,
    )();
  }

  /* Mutations */

  // TODO: Create a shortcode resolver pending implementation
  // @Mutation(() => Shortcode, {
  //   description: 'Create a shortcode for the given request.',
  // })
  // createShortcode(
  //   @Args({
  //     name: 'request',
  //     description: 'JSON string of the request object',
  //   })
  //   request: string,
  //   @Context() ctx: any,
  // ): Promise<Shortcode> {
  //   return pipe(
  //     TE.Do,
  //
  //     // Get the user
  //     TE.bind('user', () =>
  //       pipe(
  //         TE.tryCatch(
  //           () => {
  //             const authString: string | undefined | null =
  //               ctx.reqHeaders.authorization;
  //
  //             if (
  //               !authString ||
  //               !authString.includes(' ') ||
  //               !authString.startsWith('Bearer ')
  //             ) {
  //               return Promise.reject('no auth token');
  //             }
  //
  //             const authToken = authString.split(' ')[1];
  //
  //             return this.userService.authenticateWithIDToken(authToken);
  //           },
  //           (e) => e,
  //         ),
  //         TE.getOrElseW(() => T.of(undefined)),
  //         TE.fromTask,
  //       ),
  //     ),
  //
  //     // Get the Request JSON
  //     TE.bind('reqJSON', () =>
  //       pipe(
  //         E.tryCatch(
  //           () => JSON.parse(request),
  //           () => SHORTCODE_INVALID_JSON,
  //         ),
  //         TE.fromEither,
  //       ),
  //     ),
  //
  //     // Create the shortcode
  //     TE.chain(({ reqJSON, user }) => {
  //       return TE.fromTask(
  //         this.shortcodeService.createShortcode(reqJSON, user),
  //       );
  //     }),
  //
  //     // Return or throw if there is an error
  //     TE.getOrElse(throwErr),
  //   )();
  // }

  // TODO: Implement revoke shortcode
  // @Mutation(() => Boolean, {
  //   description: 'Revoke a user generated shortcode',
  // })
  // @UseGuards(GqlAuthGuard)
  // revokeShortcode(
  //   @GqlUser() user: User,
  //   @Args({
  //     name: 'code',
  //     type: () => ID,
  //     description: 'The shortcode to resolve',
  //   })
  //   code: string,
  // ): Promise<boolean> {
  //   return pipe(
  //     this.shortcodeService.revokeShortCode(code, user.uid),
  //     TE.map(() => true), // Just return true on success, no resource to return
  //     TE.getOrElse(throwErr),
  //   )();
  // }

  /* Subscriptions */

  // TODO: update subscription after fixing service methods
  // @Subscription(() => Shortcode, {
  //   description: 'Listen for shortcode creation',
  //   resolve: (value) => value,
  // })
  // @UseGuards(GqlAuthGuard)
  // myShortcodesCreated(@GqlUser() user: AuthUser) {
  //   return this.pubsub.asyncIterator(`shortcode/${user.uid}/created`);
  // }
  //
  // @Subscription(() => Shortcode, {
  //   description: 'Listen for shortcode deletion',
  //   resolve: (value) => value,
  // })
  // @UseGuards(GqlAuthGuard)
  // myShortcodesRevoked(@GqlUser() user: AuthUser): AsyncIterator<Shortcode> {
  //   return this.pubsub.asyncIterator(`shortcode/${user.uid}/revoked`);
  // }
}
