import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PubSubService } from '../pubsub/pubsub.service';
import * as E from 'fp-ts/Either';
import { UserRequest } from './user-request.model';
import { UserRequest as DbUserRequest } from '@prisma/client';
import {
  USER_COLLECTION_NOT_FOUND,
  USER_REQUEST_CREATION_FAILED,
  USER_REQUEST_INVALID_TYPE,
  USER_REQUEST_NOT_FOUND,
  USER_REQUEST_REORDERING_FAILED,
} from 'src/errors';
import { stringToJson } from 'src/utils';
import { AuthUser } from 'src/types/AuthUser';
import { ReqType } from 'src/user-history/user-history.model';
import { UserCollectionService } from 'src/user-collection/user-collection.service';

@Injectable()
export class UserRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
    private readonly userCollectionService: UserCollectionService,
  ) {}

  /**
   * Typecast a database user request to a user request
   * @param dbRequest Database user request
   * @returns User request
   */
  private cast(dbRequest: DbUserRequest): UserRequest {
    return {
      ...dbRequest,
      type: ReqType[dbRequest.type],
      request: JSON.stringify(dbRequest.request),
    };
  }

  /**
   * Get paginated user requests
   * @param collectionID ID of the collection to which the request belongs
   * @param take Number of requests to fetch
   * @param cursor ID of the request after which to fetch requests
   * @param user User who owns the requests
   * @returns Either of an Array of user requests
   */
  async fetchUserRequests(
    collectionID: string,
    type: ReqType,
    cursor: string,
    take: number,
    user: AuthUser,
  ) {
    const dbRequests = await this.prisma.userRequest.findMany({
      where: {
        userUid: user.uid,
        collectionID: collectionID,
        type,
      },
      take: take, // default: 10
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { orderIndex: 'asc' },
    });

    const userRequests: UserRequest[] = dbRequests.map((r) => this.cast(r));

    return E.right(userRequests);
  }

  /**
   * Get a user request by ID
   * @param id ID of the request to fetch
   * @param user User who owns the request
   * @returns Either of the user request
   */
  async fetchUserRequest(
    id: string,
    user: AuthUser,
  ): Promise<E.Left<string> | E.Right<UserRequest>> {
    const dbRequest = await this.prisma.userRequest.findUnique({
      where: { id },
    });
    if (!dbRequest || dbRequest.userUid !== user.uid) {
      return E.left(USER_REQUEST_NOT_FOUND);
    }

    return E.right(this.cast(dbRequest));
  }

  /**
   * Get the number of requests in a collection
   * @param collectionID ID of the collection to which the request belongs
   * @param user User who owns the collection
   * @returns Number of requests in the collection
   */
  getRequestsCountInCollection(collectionID: string): Promise<number> {
    return this.prisma.userRequest.count({
      where: { collectionID },
    });
  }

  /**
   * Create a user request
   * @param collectionID ID of the collection to which the request belongs
   * @param title title of the request
   * @param request request to create
   * @param type type of the request
   * @param user User who owns the request
   * @returns Either of the created user request
   */
  async createRequest(
    collectionID: string,
    title: string,
    request: string,
    type: ReqType,
    user: AuthUser,
  ): Promise<E.Left<string> | E.Right<UserRequest>> {
    const jsonRequest = stringToJson(request);
    if (E.isLeft(jsonRequest)) return E.left(jsonRequest.left);

    const collection = await this.userCollectionService.getUserCollection(
      collectionID,
    );
    if (E.isLeft(collection)) return E.left(collection.left);

    if (collection.right.userUid !== user.uid)
      return E.left(USER_COLLECTION_NOT_FOUND);

    if (collection.right.type !== ReqType[type])
      return E.left(USER_REQUEST_INVALID_TYPE);

    try {
      const requestCount = await this.getRequestsCountInCollection(
        collectionID,
      );

      const request = await this.prisma.userRequest.create({
        data: {
          collectionID,
          title,
          request: jsonRequest.right,
          type: ReqType[type],
          orderIndex: requestCount + 1,
          userUid: user.uid,
        },
      });

      const userRequest = this.cast(request);

      await this.pubsub.publish(
        `user_request/${user.uid}/created`,
        userRequest,
      );

      return E.right(userRequest);
    } catch (err) {
      return E.left(USER_REQUEST_CREATION_FAILED);
    }
  }

  /**
   * Update a user request
   * @param id ID of the request to update
   * @param title title of the request to update
   * @param type type of the request to update
   * @param request request to update
   * @param user User who owns the request
   */
  async updateRequest(
    id: string,
    title: string,
    type: ReqType,
    request: string,
    user: AuthUser,
  ): Promise<E.Left<string> | E.Right<UserRequest>> {
    const existRequest = await this.prisma.userRequest.findFirst({
      where: { id, userUid: user.uid },
    });
    if (!existRequest) return E.left(USER_REQUEST_NOT_FOUND);

    if (existRequest.type !== ReqType[type])
      return E.left(USER_REQUEST_INVALID_TYPE);

    let jsonRequest = undefined;
    if (request) {
      const jsonRequestE = stringToJson(request);
      if (E.isLeft(jsonRequestE)) return E.left(jsonRequestE.left);
      jsonRequest = jsonRequestE.right;
    }

    const updatedRequest = await this.prisma.userRequest.update({
      where: { id },
      data: {
        title,
        request: jsonRequest,
      },
    });

    const userRequest: UserRequest = this.cast(updatedRequest);

    await this.pubsub.publish(`user_request/${user.uid}/updated`, userRequest);

    return E.right(userRequest);
  }

  /**
   * Delete a user request
   * @param id ID of the request to delete
   * @param user User who owns the request
   * @returns Either of a boolean
   */
  async deleteRequest(
    id: string,
    user: AuthUser,
  ): Promise<E.Left<string> | E.Right<boolean>> {
    const request = await this.prisma.userRequest.findFirst({
      where: { id, userUid: user.uid },
    });
    if (!request) return E.left(USER_REQUEST_NOT_FOUND);

    await this.prisma.userRequest.updateMany({
      where: {
        collectionID: request.collectionID,
        orderIndex: { gt: request.orderIndex },
      },
      data: { orderIndex: { decrement: 1 } },
    });
    await this.prisma.userRequest.delete({ where: { id } });

    await this.pubsub.publish(
      `user_request/${user.uid}/deleted`,
      this.cast(request),
    );

    return E.right(true);
  }

  /**
   * Move a request for re-ordering inside/across collections
   * @param srcCollID ID of the source collection
   * @param destCollID ID of the destination collection
   * @param requestID ID of the request to move
   * @param nextRequestID ID of the request after which the request should be moved
   * @param user User who owns the request
   * @returns Either of the updated request
   */
  async moveRequest(
    srcCollID: string,
    destCollID: string,
    requestID: string,
    nextRequestID: string,
    user: AuthUser,
  ): Promise<E.Left<string> | E.Right<UserRequest>> {
    const twoRequests = await this.findRequestAndNextRequest(
      srcCollID,
      destCollID,
      requestID,
      nextRequestID,
      user,
    );
    if (E.isLeft(twoRequests)) return twoRequests;
    const { request, nextRequest } = twoRequests.right;

    const isTypeValidate = await this.validateTypeEqualityForMoveRequest(
      srcCollID,
      destCollID,
      request,
      nextRequest,
    );
    if (E.isLeft(isTypeValidate)) return E.left(isTypeValidate.left);

    const updatedRequest = await this.reorderRequests(
      srcCollID,
      request,
      destCollID,
      nextRequest,
    );
    if (E.isLeft(updatedRequest)) return updatedRequest;

    const userRequest: UserRequest = this.cast(updatedRequest.right);

    await this.pubsub.publish(`user_request/${user.uid}/moved`, userRequest);

    return E.right(userRequest);
  }

  /**
   * This function validate/ensure the same type (REST/GQL) in the source and destination collection and the request
   * @param srcCollID ID of the source collection
   * @param destCollID ID of the destination collection
   * @param request Request to move
   * @param nextRequest Request after which the request should be moved
   * @returns Either of a boolean
   */
  async validateTypeEqualityForMoveRequest(
    srcCollID,
    destCollID,
    request,
    nextRequest,
  ) {
    const collections = await Promise.all([
      this.userCollectionService.getUserCollection(srcCollID),
      this.userCollectionService.getUserCollection(destCollID),
    ]);

    const srcColl = collections[0];
    if (E.isLeft(srcColl)) return E.left(srcColl.left);

    const destColl = collections[1];
    if (E.isLeft(destColl)) return E.left(destColl.left);

    if (
      srcColl.right.type !== destColl.right.type ||
      (nextRequest && request.type !== nextRequest.type)
    ) {
      return E.left(USER_REQUEST_INVALID_TYPE);
    }

    return E.right(true);
  }

  /**
   * A helper function.
   * Find the request and the next request(destination collection)
   * @param srcCollID Source collection ID
   * @param destCollID Destination collection ID
   * @param requestID Request ID
   * @param nextRequestID Next request ID
   * @param user User who owns the collection
   * @returns Either Left with error message or Right with the request and the next request
   */
  async findRequestAndNextRequest(
    srcCollID: string,
    destCollID: string,
    requestID: string,
    nextRequestID: string,
    user: AuthUser,
  ): Promise<
    | E.Left<string>
    | E.Right<{
        request: DbUserRequest;
        nextRequest: DbUserRequest;
      }>
  > {
    const request = await this.prisma.userRequest.findFirst({
      where: { id: requestID, collectionID: srcCollID, userUid: user.uid },
    });
    if (!request) return E.left(USER_REQUEST_NOT_FOUND);

    let nextRequest: DbUserRequest = null;
    if (nextRequestID) {
      nextRequest = await this.prisma.userRequest.findFirst({
        where: {
          id: nextRequestID,
          collectionID: destCollID,
          userUid: user.uid,
        },
      });
      if (!nextRequest) return E.left(USER_REQUEST_NOT_FOUND);
    }

    return E.right({ request, nextRequest });
  }

  /**
   * Update order indexes of requests in collection
   * @param srcCollID - id of collection, where the request is moving from
   * @param request - request to be moved
   * @param destCollID - id of collection, where the request is moving to
   * @param nextRequest - request that comes after the updated request in its new position
   * @returns Promise of an Either of `DbUserRequest` object or error message
   */
  async reorderRequests(
    srcCollID: string,
    request: DbUserRequest,
    destCollID: string,
    nextRequest: DbUserRequest,
  ): Promise<E.Left<string> | E.Right<DbUserRequest>> {
    try {
      return await this.prisma.$transaction<
        E.Left<string> | E.Right<DbUserRequest>
      >(async (tx) => {
        const isSameCollection = srcCollID === destCollID;
        const isMovingUp = nextRequest?.orderIndex < request.orderIndex; // false, if nextRequest is null

        const nextReqOrderIndex = nextRequest?.orderIndex;
        const reqCountInDestColl = nextRequest
          ? undefined
          : await this.getRequestsCountInCollection(destCollID);

        // Updating order indexes of other requests in collection(s)
        if (isSameCollection) {
          const updateFrom = isMovingUp
            ? nextReqOrderIndex
            : request.orderIndex + 1;
          const updateTo = isMovingUp ? request.orderIndex : nextReqOrderIndex;

          await tx.userRequest.updateMany({
            where: {
              collectionID: srcCollID,
              orderIndex: { gte: updateFrom, lt: updateTo },
            },
            data: {
              orderIndex: isMovingUp ? { increment: 1 } : { decrement: 1 },
            },
          });
        } else {
          await tx.userRequest.updateMany({
            where: {
              collectionID: srcCollID,
              orderIndex: { gte: request.orderIndex },
            },
            data: { orderIndex: { decrement: 1 } },
          });

          if (nextRequest) {
            await tx.userRequest.updateMany({
              where: {
                collectionID: destCollID,
                orderIndex: { gte: nextReqOrderIndex },
              },
              data: { orderIndex: { increment: 1 } },
            });
          }
        }

        // Updating order index of the request
        let adjust: number;
        if (isSameCollection) adjust = nextRequest ? (isMovingUp ? 0 : -1) : 0;
        else adjust = nextRequest ? 0 : 1;

        const newOrderIndex =
          (nextReqOrderIndex ?? reqCountInDestColl) + adjust;

        const updatedRequest = await tx.userRequest.update({
          where: { id: request.id },
          data: { orderIndex: newOrderIndex, collectionID: destCollID },
        });

        return E.right(updatedRequest);
      });
    } catch (err) {
      return E.left(USER_REQUEST_REORDERING_FAILED);
    }
  }
}
