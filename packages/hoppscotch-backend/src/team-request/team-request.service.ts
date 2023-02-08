import { Injectable } from '@nestjs/common';
import { TeamService } from '../team/team.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  TeamRequest,
  CreateTeamRequestInput,
  UpdateTeamRequestInput,
} from './team-request.model';
import { Team } from '../team/team.model';
import { TeamCollectionService } from '../team-collection/team-collection.service';
import { TeamCollection } from '../team-collection/team-collection.model';
import {
  TEAM_REQ_INVALID_TARGET_COLL_ID,
  TEAM_INVALID_COLL_ID,
  TEAM_INVALID_ID,
  TEAM_REQ_NOT_FOUND,
} from 'src/errors';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { throwErr } from 'src/utils';
import { pipe } from 'fp-ts/function';
import * as TO from 'fp-ts/TaskOption';
import * as TE from 'fp-ts/TaskEither';
import { Prisma } from '@prisma/client';

@Injectable()
export class TeamRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly teamService: TeamService,
    private readonly teamCollectionService: TeamCollectionService,
    private readonly pubsub: PubSubService,
  ) {}

  async updateTeamRequest(
    requestID: string,
    input: UpdateTeamRequestInput,
  ): Promise<TeamRequest> {
    const updateData = {};
    if (input.request) updateData['request'] = JSON.parse(input.request);
    if (input.title !== null) updateData['title'] = input.title;

    const data = await this.prisma.teamRequest.update({
      where: {
        id: requestID,
      },
      data: {
        ...updateData,
      },
    });

    const result: TeamRequest = {
      id: data.id,
      collectionID: data.collectionID,
      request: JSON.stringify(data.request),
      title: data.title,
      teamID: data.teamID,
    };

    this.pubsub.publish(`team_req/${data.teamID}/req_updated`, result);

    return result;
  }

  async searchRequest(
    teamID: string,
    searchTerm: string,
    cursor: string | null,
  ): Promise<TeamRequest[]> {
    if (!cursor) {
      const data = await this.prisma.teamRequest.findMany({
        take: 10,
        where: {
          teamID,
          title: {
            contains: searchTerm,
          },
        },
      });

      return data.map((d) => {
        return {
          title: d.title,
          id: d.id,
          teamID: d.teamID,
          collectionID: d.collectionID,
          request: d.request!.toString(),
        };
      });
    } else {
      const data = await this.prisma.teamRequest.findMany({
        take: 10,
        skip: 1,
        cursor: {
          id: cursor,
        },
        where: {
          teamID,
          title: {
            contains: searchTerm,
          },
        },
      });

      return data.map((d) => {
        return {
          title: d.title,
          id: d.id,
          teamID: d.teamID,
          collectionID: d.collectionID,
          request: d.request!.toString(),
        };
      });
    }
  }

  async deleteTeamRequest(requestID: string): Promise<void> {
    const req = await this.getRequest(requestID);

    if (!req) throw new Error(TEAM_REQ_NOT_FOUND);

    await this.prisma.teamRequest.delete({
      where: {
        id: requestID,
      },
    });

    this.pubsub.publish(`team_req/${req.teamID}/req_deleted`, requestID);
  }

  async createTeamRequest(
    collectionID: string,
    input: CreateTeamRequestInput,
  ): Promise<TeamRequest> {
    const team = await this.teamCollectionService.getTeamOfCollection(
      collectionID,
    );

    const data = await this.prisma.teamRequest.create({
      data: {
        team: {
          connect: {
            id: team.id,
          },
        },
        request: JSON.parse(input.request),
        title: input.title,
        collection: {
          connect: {
            id: collectionID,
          },
        },
      },
    });

    const result = {
      id: data.id,
      collectionID: data.collectionID,
      title: data.title,
      request: JSON.stringify(data.request),
      teamID: data.teamID,
    };

    this.pubsub.publish(`team_req/${result.teamID}/req_created`, result);

    return result;
  }

  async getRequestsInCollection(
    collectionID: string,
    cursor: string | null,
  ): Promise<TeamRequest[]> {
    if (!cursor) {
      const res = await this.prisma.teamRequest.findMany({
        take: 10,
        where: {
          collectionID,
        },
      });

      return res.map((e) => {
        return {
          id: e.id,
          collectionID: e.collectionID,
          teamID: e.teamID,
          request: JSON.stringify(e.request),
          title: e.title,
        };
      });
    } else {
      const res = await this.prisma.teamRequest.findMany({
        cursor: {
          id: cursor,
        },
        take: 10,
        skip: 1,
        where: {
          collectionID,
        },
      });

      return res.map((e) => {
        return {
          id: e.id,
          collectionID: e.collectionID,
          teamID: e.teamID,
          request: JSON.stringify(e.request),
          title: e.title,
        };
      });
    }
  }

  async getRequest(reqID: string): Promise<TeamRequest | null> {
    const res = await this.prisma.teamRequest.findUnique({
      where: {
        id: reqID,
      },
    });

    if (!res) return null;

    return {
      id: res.id,
      teamID: res.teamID,
      collectionID: res.collectionID,
      request: JSON.stringify(res.request),
      title: res.title,
    };
  }

  getRequestTO(reqID: string): TO.TaskOption<TeamRequest> {
    return pipe(
      TO.fromTask(() => this.getRequest(reqID)),
      TO.chain(TO.fromNullable),
    );
  }

  async getTeamOfRequest(req: TeamRequest): Promise<Team> {
    return (
      (await this.teamService.getTeamWithID(req.teamID)) ??
      throwErr(TEAM_INVALID_ID)
    );
  }

  async getCollectionOfRequest(req: TeamRequest): Promise<TeamCollection> {
    return (
      (await this.teamCollectionService.getCollection(req.collectionID)) ??
      throwErr(TEAM_INVALID_COLL_ID)
    );
  }

  async getTeamOfRequestFromID(reqID: string): Promise<Team> {
    const req =
      (await this.prisma.teamRequest.findUnique({
        where: {
          id: reqID,
        },
        include: {
          team: true,
        },
      })) ?? throwErr(TEAM_REQ_NOT_FOUND);

    return req.team;
  }

  moveRequest(reqID: string, destinationCollID: string) {
    return pipe(
      TE.Do,

      // Check if the request exists
      TE.bind('request', () =>
        pipe(
          this.getRequestTO(reqID),
          TE.fromTaskOption(() => TEAM_REQ_NOT_FOUND),
        ),
      ),

      // Check if the destination collection exists (or null)
      TE.bindW('targetCollection', () =>
        pipe(
          this.teamCollectionService.getCollectionTO(destinationCollID),
          TE.fromTaskOption(() => TEAM_REQ_INVALID_TARGET_COLL_ID),
        ),
      ),

      // Block operation if target collection is not part of the same team
      // as the request
      TE.chainW(
        TE.fromPredicate(
          ({ request, targetCollection }) =>
            request.teamID === targetCollection.teamID,
          () => TEAM_REQ_INVALID_TARGET_COLL_ID,
        ),
      ),

      // Update the collection
      TE.chain(({ request, targetCollection }) =>
        TE.fromTask(() =>
          this.prisma.teamRequest.update({
            where: {
              id: request.id,
            },
            data: {
              collectionID: targetCollection.id,
            },
          }),
        ),
      ),

      // Generate TeamRequest model object
      TE.map(
        (request) =>
          <TeamRequest>{
            id: request.id,
            collectionID: request.collectionID,
            request: JSON.stringify(request.request),
            teamID: request.teamID,
            title: request.title,
          },
      ),

      // Update on PubSub
      TE.chainFirst((req) => {
        this.pubsub.publish(`team_req/${req.teamID}/req_deleted`, req.id);
        this.pubsub.publish(`team_req/${req.teamID}/req_created`, req);

        return TE.of({}); // We don't care about the return type
      }),
    );
  }
}
