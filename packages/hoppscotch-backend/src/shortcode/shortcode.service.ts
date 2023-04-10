import { Injectable, OnModuleInit } from '@nestjs/common';
import * as T from 'fp-ts/Task';
import * as O from 'fp-ts/Option';
import * as TO from 'fp-ts/TaskOption';
import * as E from 'fp-ts/Either';
import { PrismaService } from 'src/prisma/prisma.service';
import { SHORTCODE_INVALID_JSON, SHORTCODE_NOT_FOUND } from 'src/errors';
import { UserDataHandler } from 'src/user/user.data.handler';
import { Shortcode } from './shortcode.model';
import { Shortcode as DBShortCode } from '@prisma/client';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { UserService } from 'src/user/user.service';
import { stringToJson } from 'src/utils';
import { PaginationArgs } from 'src/types/input-types.args';
import { AuthUser } from '../types/AuthUser';

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

  canAllowUserDeletion(user: AuthUser): TO.TaskOption<string> {
    return TO.none;
  }

  onUserDelete(user: AuthUser): T.Task<void> {
    return async () => {
      await this.deleteUserShortCodes(user.uid);
    };
  }

  /**
   * Converts a Prisma Shortcode type into the Shortcode model
   *
   * @param shortcodeInfo Prisma Shortcode type
   * @returns GQL Shortcode
   */
  private returnShortCode(shortcodeInfo: DBShortCode): Shortcode {
    return <Shortcode>{
      id: shortcodeInfo.id,
      request: JSON.stringify(shortcodeInfo.request),
      createdOn: shortcodeInfo.createdOn,
    };
  }

  /**
   * Generate a shortcode
   *
   * @returns generated shortcode
   */
  private generateShortCodeID(): string {
    let result = '';
    for (let i = 0; i < SHORT_CODE_LENGTH; i++) {
      result +=
        SHORT_CODE_CHARS[Math.floor(Math.random() * SHORT_CODE_CHARS.length)];
    }
    return result;
  }

  /**
   * Check to see if ShortCode is already present in DB
   *
   * @returns Shortcode
   */
  private async generateUniqueShortCodeID() {
    while (true) {
      const code = this.generateShortCodeID();

      const data = await this.getShortCode(code);

      if (E.isLeft(data)) return E.right(code);
    }
  }

  /**
   * Fetch details regarding a ShortCode
   *
   * @param shortcode ShortCode
   * @returns Either of ShortCode details or error
   */
  async getShortCode(shortcode: string) {
    try {
      const shortcodeInfo = await this.prisma.shortcode.findFirstOrThrow({
        where: { id: shortcode },
      });
      return E.right(this.returnShortCode(shortcodeInfo));
    } catch (error) {
      return E.left(SHORTCODE_NOT_FOUND);
    }
  }

  /**
   * Create a new ShortCode
   *
   * @param request JSON string of request details
   * @param userUID user UID, if present
   * @returns Either of ShortCode or error
   */
  async createShortcode(request: string, userUID: string | null) {
    const shortcodeData = stringToJson(request);
    if (E.isLeft(shortcodeData)) return E.left(SHORTCODE_INVALID_JSON);

    const user = await this.userService.findUserById(userUID);

    const generatedShortCode = await this.generateUniqueShortCodeID();
    if (E.isLeft(generatedShortCode)) return E.left(generatedShortCode.left);

    const createdShortCode = await this.prisma.shortcode.create({
      data: {
        id: generatedShortCode.right,
        request: shortcodeData.right,
        creatorUid: O.isNone(user) ? null : user.value.uid,
      },
    });

    // Only publish event if creator is not null
    if (createdShortCode.creatorUid) {
      this.pubsub.publish(
        `shortcode/${createdShortCode.creatorUid}/created`,
        this.returnShortCode(createdShortCode),
      );
    }

    return E.right(this.returnShortCode(createdShortCode));
  }

  /**
   * Fetch ShortCodes created by a User
   *
   * @param uid User Uid
   * @param args Pagination arguments
   * @returns Array of ShortCodes
   */
  async fetchUserShortCodes(uid: string, args: PaginationArgs) {
    const shortCodes = await this.prisma.shortcode.findMany({
      where: {
        creatorUid: uid,
      },
      orderBy: {
        createdOn: 'desc',
      },
      skip: 1,
      take: args.take,
      cursor: args.cursor ? { id: args.cursor } : undefined,
    });

    const fetchedShortCodes: Shortcode[] = shortCodes.map((code) =>
      this.returnShortCode(code),
    );

    return fetchedShortCodes;
  }

  /**
   * Delete a ShortCode
   *
   * @param shortcode ShortCode
   * @param uid User Uid
   * @returns Boolean on successful deletion
   */
  async revokeShortCode(shortcode: string, uid: string) {
    try {
      const deletedShortCodes = await this.prisma.shortcode.delete({
        where: {
          creator_uid_shortcode_unique: {
            creatorUid: uid,
            id: shortcode,
          },
        },
      });

      this.pubsub.publish(
        `shortcode/${deletedShortCodes.creatorUid}/revoked`,
        this.returnShortCode(deletedShortCodes),
      );

      return E.right(true);
    } catch (error) {
      return E.left(SHORTCODE_NOT_FOUND);
    }
  }

  /**
   * Delete all the Users ShortCodes
   * @param uid User Uid
   * @returns number of all deleted user ShortCodes
   */
  async deleteUserShortCodes(uid: string) {
    const deletedShortCodes = await this.prisma.shortcode.deleteMany({
      where: {
        creatorUid: uid,
      },
    });

    return deletedShortCodes.count;
  }
}
