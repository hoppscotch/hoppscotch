import { Injectable } from '@nestjs/common';
import { TeamService } from '../team/team.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeamRequest } from './team-request.model';
import { TeamCollectionService } from '../team-collection/team-collection.service';
import {
  TEAM_REQ_INVALID_TARGET_COLL_ID,
  TEAM_INVALID_COLL_ID,
  TEAM_INVALID_ID,
  TEAM_REQ_NOT_FOUND,
  TEAM_REQ_REORDERING_FAILED,
} from 'src/errors';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { stringToJson } from 'src/utils';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { Prisma, TeamRequest as DbTeamRequest } from '@prisma/client';

@Injectable()
export class TeamRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamService: TeamService,
    private readonly teamCollectionService: TeamCollectionService,
    private readonly pubsub: PubSubService,
  ) {}

  /**
   * A helper function to cast the Prisma TeamRequest model to the TeamRequest model
   * @param tr TeamRequest model from Prisma
   */
  private cast(tr: DbTeamRequest) {
    return {
      id: tr.id,
      collectionID: tr.collectionID,
      teamID: tr.teamID,
      title: tr.title,
      request: JSON.stringify(tr.request),
    };
  }

  /**
   * Update team request
   * @param requestID Request ID, which is updating
   * @param title Title of the request
   * @param request Request body of the request
   */
  async updateTeamRequest(requestID: string, title: string, request: string) {
    try {
      const updateInput: Prisma.TeamRequestUpdateInput = { title };
      if (request) {
        const jsonReq = stringToJson(request);
        if (E.isLeft(jsonReq)) return E.left(jsonReq.left);
        updateInput.request = jsonReq.right;
      }

      const updatedTeamReq = await this.prisma.teamRequest.update({
        where: { id: requestID },
        data: updateInput,
      });

      const teamRequest: TeamRequest = this.cast(updatedTeamReq);

      this.pubsub.publish(
        `team_req/${teamRequest.teamID}/req_updated`,
        teamRequest,
      );

      return E.right(teamRequest);
    } catch (e) {
      return E.left(TEAM_REQ_NOT_FOUND);
    }
  }

  /**
   * Search team requests
   * @param teamID Team ID to search in
   * @param searchTerm Search term for the request title
   * @param cursor Cursor for pagination
   * @param take Number of requests to fetch
   */
  async searchRequest(
    teamID: string,
    searchTerm: string,
    cursor: string,
    take = 10,
  ) {
    const fetchedRequests = await this.prisma.teamRequest.findMany({
      take: take,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      where: {
        teamID: teamID,
        title: {
          contains: searchTerm,
        },
      },
    });

    const teamRequests = fetchedRequests.map((tr) => this.cast(tr));
    return teamRequests;
  }

  /**
   * Delete team request
   * @param requestID Request ID to delete
   */
  async deleteTeamRequest(requestID: string) {
    const dbTeamReq = await this.prisma.teamRequest.findFirst({
      where: { id: requestID },
    });
    if (!dbTeamReq) return E.left(TEAM_REQ_NOT_FOUND);

    await this.prisma.teamRequest.updateMany({
      where: { orderIndex: { gte: dbTeamReq.orderIndex } },
      data: { orderIndex: { decrement: 1 } },
    });
    await this.prisma.teamRequest.delete({
      where: { id: requestID },
    });

    this.pubsub.publish(`team_req/${dbTeamReq.teamID}/req_deleted`, requestID);

    return E.right(true);
  }

  /**
   * Create team request
   * @param collectionID Collection ID to create the request in
   * @param teamID Team ID to create the request in
   * @param title Title of the request
   * @param request Request body of the request
   */
  async createTeamRequest(
    collectionID: string,
    teamID: string,
    title: string,
    request: string,
  ) {
    const team = await this.teamCollectionService.getTeamOfCollection(
      collectionID,
    );
    if (E.isLeft(team)) return E.left(team.left);
    if (team.right.id !== teamID) return E.left(TEAM_INVALID_ID);

    const reqCountInColl = await this.getRequestsCountInCollection(
      collectionID,
    );

    const createInput: Prisma.TeamRequestCreateInput = {
      request: request,
      title: title,
      orderIndex: reqCountInColl + 1,
      team: { connect: { id: team.right.id } },
      collection: { connect: { id: collectionID } },
    };

    if (request) {
      const jsonReq = stringToJson(request);
      if (E.isLeft(jsonReq)) return E.left(jsonReq.left);
      createInput.request = jsonReq.right;
    }

    const dbTeamRequest = await this.prisma.teamRequest.create({
      data: createInput,
    });
    const teamRequest = this.cast(dbTeamRequest);
    this.pubsub.publish(
      `team_req/${teamRequest.teamID}/req_created`,
      teamRequest,
    );

    return E.right(teamRequest);
  }

  /**
   * Fetch team requests by Collection ID
   * @param collectionID Collection ID to fetch requests in
   * @param cursor Cursor for pagination
   * @param take Take number of requests
   * @returns
   */
  async getRequestsInCollection(
    collectionID: string,
    cursor: string,
    take = 10,
  ) {
    const dbTeamRequests = await this.prisma.teamRequest.findMany({
      cursor: cursor ? { id: cursor } : undefined,
      take: take,
      skip: cursor ? 1 : 0,
      where: {
        collectionID: collectionID,
      },
    });

    const teamRequests = dbTeamRequests.map((tr) => this.cast(tr));
    return teamRequests;
  }

  /**
   * Fetch team request by ID
   * @param reqID Request ID to fetch
   */
  async getRequest(reqID: string) {
    try {
      const teamRequest = await this.prisma.teamRequest.findUnique({
        where: { id: reqID },
      });
      return O.some(this.cast(teamRequest));
    } catch (e) {
      return O.none;
    }
  }

  /**
   * Fetch team by team request
   * @param teamRequest Team Request to fetch
   */
  async getTeamOfRequest(req: TeamRequest) {
    const team = await this.teamService.getTeamWithID(req.teamID);
    if (!team) return E.left(TEAM_INVALID_ID);
    return E.right(team);
  }

  /**
   * Fetch team collection by team request
   * @param teamRequest Team Request to fetch
   */
  async getCollectionOfRequest(req: TeamRequest) {
    const teamCollection = await this.teamCollectionService.getCollection(
      req.collectionID,
    );
    if (!teamCollection) return E.left(TEAM_INVALID_COLL_ID);
    return E.right(teamCollection);
  }

  /**
   * Fetch team by team request ID
   * @param reqID Team Request ID to fetch
   */
  async getTeamOfRequestFromID(reqID: string) {
    const teamRequest = await this.prisma.teamRequest.findUnique({
      where: { id: reqID },
      include: { team: true },
    });
    if (!teamRequest?.team) return O.none;
    return O.some(teamRequest.team);
  }

  /**
   * Move or re-order a request to same/another collection
   * @param srcCollID Collection ID, where the request is currently in. For backward compatibility, srcCollID is optional (can be undefined)
   * @param requestID ID of the request to be moved
   * @param destCollID Collection ID, where the request is to be moved to
   * @param nextRequestID ID of the request, which is after the request to be moved. If the request is to be moved to the end of the collection, nextRequestID should be null
   */
  async moveRequest(
    srcCollID: string,
    requestID: string,
    destCollID: string,
    nextRequestID: string,
    callerFunction: 'moveRequest' | 'updateLookUpRequestOrder',
  ) {
    // step 1: validation and find the request and next request
    const twoRequests = await this.findRequestAndNextRequest(
      srcCollID,
      requestID,
      destCollID,
      nextRequestID,
    );
    if (E.isLeft(twoRequests)) return E.left(twoRequests.left);
    const { request, nextRequest } = twoRequests.right;

    if (!srcCollID) srcCollID = request.collectionID; // if srcCollID is not provided (for backward compatibility), use the collectionID of the request

    // step 2: perform reordering
    const updatedRequest = await this.reorderRequests(
      request,
      srcCollID,
      nextRequest,
      destCollID,
    );
    if (E.isLeft(updatedRequest)) return E.left(updatedRequest.left);

    const teamReq = this.cast(updatedRequest.right);

    // step 3: publish the event
    if (callerFunction === 'moveRequest') {
      this.pubsub.publish(`team_req/${teamReq.teamID}/req_moved`, teamReq);
    } else if (callerFunction === 'updateLookUpRequestOrder') {
      this.pubsub.publish(`team_req/${request.teamID}/req_order_updated`, {
        request: this.cast(updatedRequest.right),
        nextRequest: nextRequest ? this.cast(nextRequest) : null,
      });
    }

    return E.right(teamReq);
  }

  /**
   * A helper function to find the request and next request
   * @param srcCollID Collection ID, where the request is currently in
   * @param requestID ID of the request to be moved
   * @param destCollID Collection ID, where the request is to be moved to
   * @param nextRequestID ID of the request, which is after the request to be moved. If the request is to be moved to the end of the collection, nextRequestID should be null
   */
  async findRequestAndNextRequest(
    srcCollID: string,
    requestID: string,
    destCollID: string,
    nextRequestID: string,
  ) {
    const request = await this.prisma.teamRequest.findFirst({
      where: { id: requestID, collectionID: srcCollID },
    });
    if (!request) return E.left(TEAM_REQ_NOT_FOUND);

    let nextRequest = null;
    if (nextRequestID) {
      nextRequest = await this.prisma.teamRequest.findFirst({
        where: { id: nextRequestID },
      });
      if (!nextRequest) return E.left(TEAM_REQ_NOT_FOUND);

      if (
        nextRequest.collectionID !== destCollID ||
        request.teamID !== nextRequest.teamID
      ) {
        return E.left(TEAM_REQ_INVALID_TARGET_COLL_ID);
      }
    }

    return E.right({ request, nextRequest });
  }

  /**
   * A helper function to get the number of requests in a collection
   * @param collectionID Collection ID to fetch
   */
  async getRequestsCountInCollection(collectionID: string) {
    return this.prisma.teamRequest.count({
      where: { collectionID },
    });
  }

  /**
   * A helper function to reorder requests
   * @param request The request to be moved
   * @param srcCollID Collection ID, where the request is currently in
   * @param nextRequest The request, which is after the request to be moved. If the request is to be moved to the end of the collection, nextRequest should be null
   * @param destCollID Collection ID, where the request is to be moved to
   */
  async reorderRequests(
    request: DbTeamRequest,
    srcCollID: string,
    nextRequest: DbTeamRequest,
    destCollID: string,
  ) {
    try {
      return await this.prisma.$transaction<
        E.Left<string> | E.Right<DbTeamRequest>
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

          await tx.teamRequest.updateMany({
            where: {
              collectionID: srcCollID,
              orderIndex: { gte: updateFrom, lt: updateTo },
            },
            data: {
              orderIndex: isMovingUp ? { increment: 1 } : { decrement: 1 },
            },
          });
        } else {
          await tx.teamRequest.updateMany({
            where: {
              collectionID: srcCollID,
              orderIndex: { gte: request.orderIndex },
            },
            data: { orderIndex: { decrement: 1 } },
          });

          if (nextRequest) {
            await tx.teamRequest.updateMany({
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

        const updatedRequest = await tx.teamRequest.update({
          where: { id: request.id },
          data: { orderIndex: newOrderIndex, collectionID: destCollID },
        });

        return E.right(updatedRequest);
      });
    } catch (err) {
      return E.left(TEAM_REQ_REORDERING_FAILED);
    }
  }

  /**
   * Return count of total requests in a team
   * @param teamID team ID
   */
  async totalRequestsInATeam(teamID: string) {
    const requestsCount = await this.prisma.teamRequest.count({
      where: {
        teamID: teamID,
      },
    });

    return requestsCount;
  }

  /**
   * Fetch list of all the Team Requests in DB
   *
   * @returns number of Team Requests in the DB
   */
  async getTeamRequestsCount() {
    const teamRequestsCount = this.prisma.teamRequest.count();
    return teamRequestsCount;
  }
}
