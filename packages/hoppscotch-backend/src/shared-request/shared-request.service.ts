import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { Shortcode as DBSharedRequest } from '@prisma/client';
import { UserService } from 'src/user/user.service';
import * as E from 'fp-ts/Either';
import { SharedRequest } from './shared-requests.model';
import { SHARED_REQUEST_NOT_FOUND } from 'src/errors';
@Injectable()
export class SharedRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
    private readonly userService: UserService,
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
}
