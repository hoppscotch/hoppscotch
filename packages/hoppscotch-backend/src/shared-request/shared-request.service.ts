import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { Shortcode as DBSharedRequest } from '@prisma/client';
import * as E from 'fp-ts/Either';
import * as TO from 'fp-ts/TaskOption';
import * as T from 'fp-ts/Task';
import { SharedRequest } from './shared-requests.model';
import {
  SHARED_REQUEST_INVALID_PROPERTIES_JSON,
  SHARED_REQUEST_INVALID_REQUEST_JSON,
  SHARED_REQUEST_NOT_FOUND,
  SHARED_REQUEST_PROPERTIES_NOT_FOUND,
} from 'src/errors';
import { stringToJson } from 'src/utils';
import { AuthUser } from 'src/types/AuthUser';
import { PaginationArgs } from 'src/types/input-types.args';
import { UserDataHandler } from 'src/user/user.data.handler';
import { UserService } from 'src/user/user.service';

const SHORT_CODE_LENGTH = 12;
const SHORT_CODE_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
@Injectable()
export class SharedRequestService implements UserDataHandler, OnModuleInit {
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
      await this.deleteUserSharedRequests(user.uid);
    };
  }

  /**
   * Delete all the Users SharedRequests
   * @param uid User Uid
   * @returns number of all deleted user SharedRequests
   */
  async deleteUserSharedRequests(uid: string) {
    const deletedShortCodes = await this.prisma.shortcode.deleteMany({
      where: {
        creatorUid: uid,
      },
    });

    return deletedShortCodes.count;
  }

  /**
   * Converts a Prisma SharedRequest type into the SharedRequest model
   *
   * @param sharedRequestInfo Prisma SharedRequest type
   * @returns GQL SharedRequest
   */
  private cast(sharedRequestInfo: DBSharedRequest): SharedRequest {
    return <SharedRequest>{
      id: sharedRequestInfo.id,
      request: JSON.stringify(sharedRequestInfo.request),
      properties:
        sharedRequestInfo.properties != null
          ? JSON.stringify(sharedRequestInfo.properties)
          : null,
      createdOn: sharedRequestInfo.createdOn,
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

      const data = await this.getSharedRequest(code);
      if (E.isLeft(data)) return E.right(code);
    }
  }

  /**
   * Fetch details regarding a SharedRequest
   *
   * @param sharedRequestID SharedRequest
   * @returns Either of SharedRequest details or error
   */
  async getSharedRequest(sharedRequestID: string) {
    try {
      const sharedRequest = await this.prisma.shortcode.findFirstOrThrow({
        where: { id: sharedRequestID },
      });
      return E.right(this.cast(sharedRequest));
    } catch (error) {
      return E.left(SHARED_REQUEST_NOT_FOUND);
    }
  }

  /**
   * Create a new SharedRequest
   *
   * @param request JSON string of request details
   * @param properties JSON string of embed properties, if present
   * @returns Either of SharedRequest or error
   */
  async createSharedRequest(
    request: string,
    properties: string | null = null,
    userInfo: AuthUser,
  ) {
    const requestData = stringToJson(request);
    if (E.isLeft(requestData))
      return E.left(SHARED_REQUEST_INVALID_REQUEST_JSON);

    const parsedProperties = stringToJson(properties);
    if (E.isLeft(parsedProperties))
      return E.left(SHARED_REQUEST_INVALID_PROPERTIES_JSON);

    const generatedShortCode = await this.generateUniqueShortCodeID();
    if (E.isLeft(generatedShortCode)) return E.left(generatedShortCode.left);

    const createdSharedRequest = await this.prisma.shortcode.create({
      data: {
        id: generatedShortCode.right,
        request: requestData.right,
        properties: parsedProperties.right ?? undefined,
        creatorUid: userInfo.uid,
      },
    });

    this.pubsub.publish(
      `shared_request/${createdSharedRequest.creatorUid}/created`,
      this.cast(createdSharedRequest),
    );

    return E.right(this.cast(createdSharedRequest));
  }

  /**
   * Fetch SharedRequest created by a User
   *
   * @param uid User Uid
   * @param args Pagination arguments
   * @returns Array of SharedRequest
   */
  async fetchUserSharedRequests(uid: string, args: PaginationArgs) {
    const sharedRequests = await this.prisma.shortcode.findMany({
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

    const fetchedSharedRequests: SharedRequest[] = sharedRequests.map((code) =>
      this.cast(code),
    );

    return fetchedSharedRequests;
  }

  /**
   * Delete a SharedRequest
   *
   * @param sharedRequestID SharedRequest ID
   * @param uid User Uid
   * @returns Boolean on successful deletion
   */
  async revokeSharedRequest(sharedRequestID: string, uid: string) {
    try {
      const deletedSharedRequest = await this.prisma.shortcode.delete({
        where: {
          creator_uid_shortcode_unique: {
            creatorUid: uid,
            id: sharedRequestID,
          },
        },
      });

      this.pubsub.publish(
        `shared_request/${deletedSharedRequest.creatorUid}/revoked`,
        this.cast(deletedSharedRequest),
      );

      return E.right(true);
    } catch (error) {
      return E.left(SHARED_REQUEST_NOT_FOUND);
    }
  }

  /**
   * Update a created SharedRequest
   * @param sharedRequestID SharedRequest ID
   * @param uid User Uid
   * @returns Updated SharedRequest
   */
  async updateSharedRequest(
    sharedRequestID: string,
    uid: string,
    updatedProps: string,
  ) {
    if (!updatedProps) return E.left(SHARED_REQUEST_PROPERTIES_NOT_FOUND);

    const parsedProperties = stringToJson(updatedProps);
    if (E.isLeft(parsedProperties))
      return E.left(SHARED_REQUEST_INVALID_PROPERTIES_JSON);

    try {
      const updatedSharedRequest = await this.prisma.shortcode.update({
        where: {
          creator_uid_shortcode_unique: {
            creatorUid: uid,
            id: sharedRequestID,
          },
        },
        data: {
          properties: updatedProps,
        },
      });

      this.pubsub.publish(
        `shared_request/${updatedSharedRequest.creatorUid}/updated`,
        this.cast(updatedSharedRequest),
      );

      return E.right(this.cast(updatedSharedRequest));
    } catch (error) {
      return E.left(SHARED_REQUEST_NOT_FOUND);
    }
  }
}
