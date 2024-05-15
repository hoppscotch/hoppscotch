import { Injectable, OnModuleInit } from '@nestjs/common';
import * as T from 'fp-ts/Task';
import * as TO from 'fp-ts/TaskOption';
import * as E from 'fp-ts/Either';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  SHORTCODE_INVALID_PROPERTIES_JSON,
  SHORTCODE_INVALID_REQUEST_JSON,
  SHORTCODE_NOT_FOUND,
  SHORTCODE_PROPERTIES_NOT_FOUND,
} from 'src/errors';
import { UserDataHandler } from 'src/user/user.data.handler';
import { Shortcode, ShortcodeWithUserEmail } from './shortcode.model';
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
  private cast(shortcodeInfo: DBShortCode): Shortcode {
    return <Shortcode>{
      id: shortcodeInfo.id,
      request: JSON.stringify(shortcodeInfo.request),
      properties:
        shortcodeInfo.embedProperties != null
          ? JSON.stringify(shortcodeInfo.embedProperties)
          : null,
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
      return E.right(this.cast(shortcodeInfo));
    } catch (error) {
      return E.left(SHORTCODE_NOT_FOUND);
    }
  }

  /**
   * Create a new ShortCode
   *
   * @param request JSON string of request details
   * @param userInfo user UI
   * @param properties JSON string of embed properties, if present
   * @returns Either of ShortCode or error
   */
  async createShortcode(
    request: string,
    properties: string | null = null,
    userInfo: AuthUser,
  ) {
    const requestData = stringToJson(request);
    if (E.isLeft(requestData) || !requestData.right)
      return E.left(SHORTCODE_INVALID_REQUEST_JSON);

    const parsedProperties = stringToJson(properties);
    if (E.isLeft(parsedProperties))
      return E.left(SHORTCODE_INVALID_PROPERTIES_JSON);

    const generatedShortCode = await this.generateUniqueShortCodeID();
    if (E.isLeft(generatedShortCode)) return E.left(generatedShortCode.left);

    const createdShortCode = await this.prisma.shortcode.create({
      data: {
        id: generatedShortCode.right,
        request: requestData.right,
        embedProperties: parsedProperties.right ?? undefined,
        creatorUid: userInfo.uid,
      },
    });

    // Only publish event if creator is not null
    if (createdShortCode.creatorUid) {
      this.pubsub.publish(
        `shortcode/${createdShortCode.creatorUid}/created`,
        this.cast(createdShortCode),
      );
    }

    return E.right(this.cast(createdShortCode));
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
      skip: args.cursor ? 1 : 0,
      take: args.take,
      cursor: args.cursor ? { id: args.cursor } : undefined,
    });

    const fetchedShortCodes: Shortcode[] = shortCodes.map((code) =>
      this.cast(code),
    );

    return fetchedShortCodes;
  }

  /**
   * Delete a ShortCode created by User of uid
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
        this.cast(deletedShortCodes),
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

  /**
   * Delete a Shortcode
   *
   * @param shortcodeID ID of Shortcode being deleted
   * @returns Boolean on successful deletion
   */
  async deleteShortcode(shortcodeID: string) {
    try {
      await this.prisma.shortcode.delete({
        where: {
          id: shortcodeID,
        },
      });

      return E.right(true);
    } catch (error) {
      return E.left(SHORTCODE_NOT_FOUND);
    }
  }

  /**
   * Update a created Shortcode
   * @param shortcodeID Shortcode ID
   * @param uid User Uid
   * @returns Updated Shortcode
   */
  async updateEmbedProperties(
    shortcodeID: string,
    uid: string,
    updatedProps: string,
  ) {
    if (!updatedProps) return E.left(SHORTCODE_PROPERTIES_NOT_FOUND);

    const parsedProperties = stringToJson(updatedProps);
    if (E.isLeft(parsedProperties) || !parsedProperties.right)
      return E.left(SHORTCODE_INVALID_PROPERTIES_JSON);

    try {
      const updatedShortcode = await this.prisma.shortcode.update({
        where: {
          creator_uid_shortcode_unique: {
            creatorUid: uid,
            id: shortcodeID,
          },
        },
        data: {
          embedProperties: parsedProperties.right,
        },
      });

      this.pubsub.publish(
        `shortcode/${updatedShortcode.creatorUid}/updated`,
        this.cast(updatedShortcode),
      );

      return E.right(this.cast(updatedShortcode));
    } catch (error) {
      return E.left(SHORTCODE_NOT_FOUND);
    }
  }

  /**
   * Fetch all created ShortCodes
   *
   * @param args Pagination arguments
   * @param userEmail User email
   * @returns ShortcodeWithUserEmail
   */
  async fetchAllShortcodes(
    args: PaginationArgs,
    userEmail: string | null = null,
  ) {
    const shortCodes = await this.prisma.shortcode.findMany({
      where: userEmail
        ? {
            User: {
              email: {
                equals: userEmail,
                mode: 'insensitive',
              },
            },
          }
        : undefined,
      orderBy: {
        createdOn: 'desc',
      },
      skip: args.cursor ? 1 : 0,
      take: args.take,
      cursor: args.cursor ? { id: args.cursor } : undefined,
      include: {
        User: true,
      },
    });

    const fetchedShortCodes: ShortcodeWithUserEmail[] = shortCodes.map(
      (code) => {
        return <ShortcodeWithUserEmail>{
          id: code.id,
          request: JSON.stringify(code.request),
          properties:
            code.embedProperties != null
              ? JSON.stringify(code.embedProperties)
              : null,
          createdOn: code.createdOn,
          creator: code.User
            ? {
                uid: code.User.uid,
                email: code.User.email,
              }
            : null,
        };
      },
    );

    return fetchedShortCodes;
  }
}
