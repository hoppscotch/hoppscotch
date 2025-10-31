import { mockDeep } from 'jest-mock-extended';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { TeamCollectionService } from 'src/team-collection/team-collection.service';
import { TeamRequestService } from 'src/team-request/team-request.service';
import { UserRequestService } from 'src/user-request/user-request.service';
import { UserCollectionService } from 'src/user-collection/user-collection.service';
import { SortService } from './sort.service';
import { SortOptions } from 'src/types/SortOptions';
import * as E from 'fp-ts/Either';
import {
  TEAM_COL_REORDERING_FAILED,
  TEAM_REQ_REORDERING_FAILED,
} from 'src/errors';

const mockUserRequestService = mockDeep<UserRequestService>();
const mockUserCollectionService = mockDeep<UserCollectionService>();
const mockTeamCollectionService = mockDeep<TeamCollectionService>();
const mockTeamRequestService = mockDeep<TeamRequestService>();
const mockPubSub = mockDeep<PubSubService>();

const sortService = new SortService(
  mockUserCollectionService,
  mockUserRequestService,
  mockTeamCollectionService,
  mockTeamRequestService,
  mockPubSub,
);

beforeEach(() => {
  mockPubSub.publish.mockClear();
});

describe('sortTeamCollections', () => {
  it('should return left if teamCollectionService.sortTeamCollections fails', async () => {
    mockTeamCollectionService.sortTeamCollections.mockResolvedValue(
      E.left(TEAM_COL_REORDERING_FAILED),
    );
    const result = await sortService.sortTeamCollections(
      'teamID',
      'parentCollectionID',
      SortOptions.TITLE_ASC,
    );
    expect(result).toEqual(E.left(TEAM_COL_REORDERING_FAILED));
    expect(mockTeamCollectionService.sortTeamCollections).toHaveBeenCalledWith(
      'teamID',
      'parentCollectionID',
      SortOptions.TITLE_ASC,
    );
  });
  it('should return left if teamRequestService.sortTeamRequests fails', async () => {
    mockTeamCollectionService.sortTeamCollections.mockResolvedValue(
      E.right(true),
    );
    mockTeamRequestService.sortTeamRequests.mockResolvedValue(
      E.left(TEAM_REQ_REORDERING_FAILED),
    );
    const result = await sortService.sortTeamCollections(
      'teamID',
      'parentCollectionID',
      SortOptions.TITLE_ASC,
    );
    expect(result).toEqual(E.left(TEAM_REQ_REORDERING_FAILED));
    expect(mockTeamRequestService.sortTeamRequests).toHaveBeenCalledWith(
      'teamID',
      'parentCollectionID',
      SortOptions.TITLE_ASC,
    );
  });
  it('should publish root event if parentCollectionID is falsy', async () => {
    mockTeamCollectionService.sortTeamCollections.mockResolvedValue(
      E.right(true),
    );
    mockTeamRequestService.sortTeamRequests.mockResolvedValue(E.right(true));
    const result = await sortService.sortTeamCollections(
      'teamID',
      null,
      SortOptions.TITLE_ASC,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll_root/teamID/sorted`,
      true,
    );
    expect(result).toEqual(E.right(true));
  });
  it('should publish child event if parentCollectionID is truthy', async () => {
    mockTeamCollectionService.sortTeamCollections.mockResolvedValue(
      E.right(true),
    );
    mockTeamRequestService.sortTeamRequests.mockResolvedValue(E.right(true));
    const result = await sortService.sortTeamCollections(
      'teamID',
      'parentCollectionID',
      SortOptions.TITLE_ASC,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `team_coll_child/teamID/sorted`,
      'parentCollectionID',
    );
    expect(result).toEqual(E.right(true));
  });
});

describe('sortUserCollections', () => {
  it('should return left if userCollectionService.sortUserCollections fails', async () => {
    mockUserCollectionService.sortUserCollections.mockResolvedValue(
      E.left('user_coll/reordering_failed'),
    );
    const result = await sortService.sortUserCollections(
      'userID',
      'parentCollectionID',
      SortOptions.TITLE_ASC,
    );
    expect(result).toEqual(E.left('user_coll/reordering_failed'));
    expect(mockUserCollectionService.sortUserCollections).toHaveBeenCalledWith(
      'userID',
      'parentCollectionID',
      SortOptions.TITLE_ASC,
    );
  });

  it('should return left if userRequestService.sortUserRequests fails', async () => {
    mockUserCollectionService.sortUserCollections.mockResolvedValue(
      E.right(true),
    );
    mockUserRequestService.sortUserRequests.mockResolvedValue(
      E.left('user_coll/reordering_failed'),
    );
    const result = await sortService.sortUserCollections(
      'userID',
      'parentCollectionID',
      SortOptions.TITLE_ASC,
    );
    expect(result).toEqual(E.left('user_coll/reordering_failed'));
    expect(mockUserRequestService.sortUserRequests).toHaveBeenCalledWith(
      'userID',
      'parentCollectionID',
      SortOptions.TITLE_ASC,
    );
  });

  it('should publish root event if parentCollectionID is falsy', async () => {
    mockUserCollectionService.sortUserCollections.mockResolvedValue(
      E.right(true),
    );
    mockUserRequestService.sortUserRequests.mockResolvedValue(E.right(true));
    const result = await sortService.sortUserCollections(
      'userID',
      null,
      SortOptions.TITLE_ASC,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll_root/userID/sorted`,
      {
        parentCollectionID: null,
        sortOption: SortOptions.TITLE_ASC,
      },
    );
    expect(result).toEqual(E.right(true));
  });

  it('should publish child event if parentCollectionID is truthy', async () => {
    mockUserCollectionService.sortUserCollections.mockResolvedValue(
      E.right(true),
    );
    mockUserRequestService.sortUserRequests.mockResolvedValue(E.right(true));
    const result = await sortService.sortUserCollections(
      'userID',
      'parentCollectionID',
      SortOptions.TITLE_ASC,
    );
    expect(mockPubSub.publish).toHaveBeenCalledWith(
      `user_coll_child/userID/sorted`,
      {
        parentCollectionID: 'parentCollectionID',
        sortOption: SortOptions.TITLE_ASC,
      },
    );
    expect(result).toEqual(E.right(true));
  });
});
