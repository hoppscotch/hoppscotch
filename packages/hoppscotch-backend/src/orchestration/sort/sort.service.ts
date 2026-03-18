import { Injectable } from '@nestjs/common';
import { TeamCollectionService } from 'src/team-collection/team-collection.service';
import * as E from 'fp-ts/Either';
import { SortOptions } from 'src/types/SortOptions';
import { TeamRequestService } from 'src/team-request/team-request.service';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { UserRequestService } from 'src/user-request/user-request.service';
import { UserCollectionService } from 'src/user-collection/user-collection.service';

@Injectable()
export class SortService {
  constructor(
    private readonly userCollectionService: UserCollectionService,
    private readonly userRequestService: UserRequestService,
    private readonly teamCollectionService: TeamCollectionService,
    private readonly teamRequestService: TeamRequestService,
    private readonly pubsub: PubSubService,
  ) {}

  async sortTeamCollections(
    teamID: string,
    parentCollectionID: string,
    sortOption: SortOptions,
  ) {
    const isCollectionSorted =
      await this.teamCollectionService.sortTeamCollections(
        teamID,
        parentCollectionID,
        sortOption,
      );

    if (E.isLeft(isCollectionSorted)) return E.left(isCollectionSorted.left);

    const isRequestSorted = await this.teamRequestService.sortTeamRequests(
      teamID,
      parentCollectionID,
      sortOption,
    );

    if (E.isLeft(isRequestSorted)) return E.left(isRequestSorted.left);

    // Publish the sort event
    if (!parentCollectionID) {
      this.pubsub.publish(`team_coll_root/${teamID}/sorted`, true);
    } else {
      this.pubsub.publish(
        `team_coll_child/${teamID}/sorted`,
        parentCollectionID,
      );
    }

    return E.right(true);
  }

  async sortUserCollections(
    userID: string,
    parentCollectionID: string,
    sortOption: SortOptions,
  ) {
    const isCollectionSorted =
      await this.userCollectionService.sortUserCollections(
        userID,
        parentCollectionID,
        sortOption,
      );

    if (E.isLeft(isCollectionSorted)) return E.left(isCollectionSorted.left);

    const isRequestSorted = await this.userRequestService.sortUserRequests(
      userID,
      parentCollectionID,
      sortOption,
    );

    if (E.isLeft(isRequestSorted)) return E.left(isRequestSorted.left);

    // Publish the sort event
    if (!parentCollectionID) {
      this.pubsub.publish(`user_coll_root/${userID}/sorted`, {
        parentCollectionID,
        sortOption,
      });
    } else {
      this.pubsub.publish(`user_coll_child/${userID}/sorted`, {
        parentCollectionID,
        sortOption,
      });
    }

    return E.right(true);
  }
}
