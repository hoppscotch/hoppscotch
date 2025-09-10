import { Injectable } from '@nestjs/common';
import { TeamCollectionService } from 'src/team-collection/team-collection.service';
import * as E from 'fp-ts/Either';
import { SortOptions } from 'src/types/SortOptions';
import { TeamRequestService } from 'src/team-request/team-request.service';
import { PubSubService } from 'src/pubsub/pubsub.service';

@Injectable()
export class SortService {
  constructor(
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

    this.pubsub.publish(
      `team_coll/${parentCollectionID ? parentCollectionID : 'root'}/sorted`,
      parentCollectionID ?? true,
    );

    return E.right(true);
  }
}
