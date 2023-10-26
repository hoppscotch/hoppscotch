import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { Shortcode as DBSharedRequest } from '@prisma/client';
import * as E from 'fp-ts/Either';
import { SharedRequest } from './shared-requests.model';
import {
  SHARED_REQUEST_INVALID_PROPERTIES_JSON,
  SHARED_REQUEST_INVALID_REQUEST_JSON,
  SHARED_REQUEST_NOT_FOUND,
} from 'src/errors';
import { stringToJson } from 'src/utils';
import { AuthUser } from 'src/types/AuthUser';
import { PaginationArgs } from 'src/types/input-types.args';

const SHORT_CODE_LENGTH = 12;
const SHORT_CODE_CHARS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
@Injectable()
export class SharedRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
  ) {}

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
      properties: JSON.stringify(sharedRequestInfo.properties),
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
    properties: string | null,
    userInfo: AuthUser,
  ) {
    const requestData = stringToJson(request);
    if (E.isLeft(requestData))
      return E.left(SHARED_REQUEST_INVALID_REQUEST_JSON);

    let propertiesData;
    if (!properties) propertiesData = undefined;
    const parsedProperties = stringToJson(properties);
    if (E.isLeft(parsedProperties))
      return E.left(SHARED_REQUEST_INVALID_PROPERTIES_JSON);
    propertiesData = parsedProperties.right;

    const generatedShortCode = await this.generateUniqueShortCodeID();
    if (E.isLeft(generatedShortCode)) return E.left(generatedShortCode.left);

    const createdSharedRequest = await this.prisma.shortcode.create({
      data: {
        id: generatedShortCode.right,
        request: requestData.right,
        properties: propertiesData != null ? propertiesData : undefined,
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
   * @param sharedRequestID SharedRequest
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
}
