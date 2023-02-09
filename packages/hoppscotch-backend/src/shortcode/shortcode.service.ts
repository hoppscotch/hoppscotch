import { Injectable, OnModuleInit } from '@nestjs/common';
import { flow, pipe } from 'fp-ts/function';
import * as T from 'fp-ts/Task';
import * as TE from 'fp-ts/TaskEither';
import * as O from 'fp-ts/Option';
import * as TO from 'fp-ts/TaskOption';
import * as A from 'fp-ts/Array';

import { PrismaService } from 'src/prisma/prisma.service';
import { SHORTCODE_NOT_FOUND } from 'src/errors';
import { User } from 'src/user/user.model';
import { UserDataHandler } from 'src/user/user.data.handler';
import { Shortcode } from './shortcode.model';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { UserService } from 'src/user/user.service';

const SHORT_CODE_LENGTH = 12;
const SHORT_CODE_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

@Injectable()
export class ShortcodeService implements UserDataHandler, OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
    private readonly userService: UserService,
  ) {}

  onModuleInit() {
    this.userService.registerUserDataHandler(this);
  }

  canAllowUserDeletion(user: User): TO.TaskOption<string> {
    return TO.none;
  }

  onUserDelete(user: User): T.Task<void> {
    // return this.deleteUserShortcodes(user.uid);
    return undefined;
  }

  private generateShortcodeID(): string {
    let result = '';
    for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
      result +=
        SHORT_CODE_CHARS[Math.floor(Math.random() * SHORT_CODE_CHARS.length)];
    }
    return result;
  }

  private async generateUniqueShortcodeID(): Promise<string> {
    while (true) {
      const code = this.generateShortcodeID();

      const data = await this.resolveShortcode(code)();

      if (O.isNone(data)) return code;
    }
  }

  resolveShortcode(shortcode: string): TO.TaskOption<Shortcode> {
    return pipe(
      // The task to perform
      () => this.prisma.shortcode.findFirst({ where: { id: shortcode } }),
      TO.fromTask, // Convert to Task to TaskOption
      TO.chain(TO.fromNullable), // Remove nullability
      TO.map((data) => {
        return <Shortcode>{
          id: data.id,
          request: JSON.stringify(data.request),
          createdOn: data.createdOn,
        };
      }),
    );
  }

  // TODO: Implement create shortcode and the user service method
  // createShortcode(request: any, creator?: User): T.Task<Shortcode> {
  //   return pipe(
  //     T.Do,
  //
  //     // Get shortcode
  //     T.bind('shortcode', () => () => this.generateUniqueShortcodeID()),
  //
  //     // Create
  //     T.chain(
  //       ({ shortcode }) =>
  //         () =>
  //           this.prisma.shortcode.create({
  //             data: {
  //               id: shortcode,
  //               request: request,
  //               creatorUid: creator?.uid,
  //             },
  //           }),
  //     ),
  //
  //     T.chainFirst((shortcode) => async () => {
  //       // Only publish event if creator is not null
  //       if (shortcode.creatorUid) {
  //         this.pubsub.publish(`shortcode/${shortcode.creatorUid}/created`, <
  //           Shortcode
  //         >{
  //           id: shortcode.id,
  //           request: JSON.stringify(shortcode.request),
  //           createdOn: shortcode.createdOn,
  //         });
  //       }
  //     }),
  //
  //     // Map to valid return type
  //     T.map(
  //       (data) =>
  //         <Shortcode>{
  //           id: data.id,
  //           request: JSON.stringify(data.request),
  //           createdOn: data.createdOn,
  //         },
  //     ),
  //   );
  // }

  fetchUserShortCodes(uid: string, cursor: string | null) {
    return pipe(
      cursor,
      O.fromNullable,
      O.fold(
        () =>
          pipe(
            () =>
              this.prisma.shortcode.findMany({
                take: 10,
                where: {
                  creatorUid: uid,
                },
                orderBy: {
                  createdOn: 'desc',
                },
              }),
            T.map((codes) =>
              codes.map(
                (data) =>
                  <Shortcode>{
                    id: data.id,
                    request: JSON.stringify(data.request),
                    createdOn: data.createdOn,
                  },
              ),
            ),
          ),
        (cursor) =>
          pipe(
            () =>
              this.prisma.shortcode.findMany({
                take: 10,
                skip: 1,
                cursor: {
                  id: cursor,
                },
                where: {
                  creatorUid: uid,
                },
                orderBy: {
                  createdOn: 'desc',
                },
              }),
            T.map((codes) =>
              codes.map(
                (data) =>
                  <Shortcode>{
                    id: data.id,
                    request: JSON.stringify(data.request),
                    createdOn: data.createdOn,
                  },
              ),
            ),
          ),
      ),
    );
  }

  // TODO: Implement revoke shortcode and user shortcode deletion feature
  // revokeShortCode(shortcode: string, uid: string) {
  //   return pipe(
  //     TE.tryCatch(
  //       () =>
  //         this.prisma.shortcode.delete({
  //           where: {
  //             creator_uid_shortcode_unique: {
  //               creatorUid: uid,
  //               id: shortcode,
  //             },
  //           },
  //         }),
  //       () => SHORTCODE_NOT_FOUND,
  //     ),
  //     TE.chainFirst((shortcode) =>
  //       TE.fromTask(() =>
  //         this.pubsub.publish(`shortcode/${shortcode.creatorUid}/revoked`, <
  //           Shortcode
  //         >{
  //           id: shortcode.id,
  //           request: JSON.stringify(shortcode.request),
  //           createdOn: shortcode.createdOn,
  //         }),
  //       ),
  //     ),
  //     TE.map(
  //       (data) =>
  //         <Shortcode>{
  //           id: data.id,
  //           request: JSON.stringify(data.request),
  //           createdOn: data.createdOn,
  //         },
  //     ),
  //   );
  // }

  // deleteUserShortcodes(uid: string) {
  //   return pipe(
  //     () =>
  //       this.prisma.shortcode.findMany({
  //         where: {
  //           creatorUid: uid,
  //         },
  //       }),
  //     T.chain(
  //       flow(
  //         A.map((shortcode) => this.revokeShortCode(shortcode.id, uid)),
  //         T.sequenceArray,
  //       ),
  //     ),
  //     T.map(() => undefined),
  //   );
  // }
}
