import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TeamCollection } from './team-collection.model';
import {
  TEAM_COLL_SHORT_TITLE,
  TEAM_COLL_INVALID_JSON,
  TEAM_INVALID_COLL_ID,
  TEAM_NOT_OWNER,
  TEAM_COLL_NOT_FOUND,
  TEAM_COL_ALREADY_ROOT,
  TEAM_COLL_DEST_SAME,
  TEAM_COLL_NOT_SAME_TEAM,
  TEAM_COLL_IS_PARENT_COLL,
  TEAM_COL_SAME_NEXT_COLL,
  TEAM_COL_REORDERING_FAILED,
  TEAM_COLL_DATA_INVALID,
  TEAM_REQ_SEARCH_FAILED,
  TEAM_COL_SEARCH_FAILED,
  TEAM_REQ_PARENT_TREE_GEN_FAILED,
  TEAM_COLL_PARENT_TREE_GEN_FAILED,
  TEAM_MEMBER_NOT_FOUND,
  TEAM_COLL_CREATION_FAILED,
} from '../errors';
import { PubSubService } from '../pubsub/pubsub.service';
import {
  delay,
  escapeSqlLikeString,
  isValidLength,
  transformCollectionData,
} from 'src/utils';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import {
  Prisma,
  TeamCollection as DBTeamCollection,
  TeamRequest,
} from '@prisma/client';
import { CollectionFolder } from 'src/types/CollectionFolder';
import { stringToJson } from 'src/utils';
import { CollectionSearchNode } from 'src/types/CollectionSearchNode';
import {
  GetCollectionResponse,
  ParentTreeQueryReturnType,
  SearchQueryReturnType,
} from './helper';
import { RESTError } from 'src/types/RESTError';
import { TeamService } from 'src/team/team.service';
import { PrismaError } from 'src/prisma/prisma-error-codes';

@Injectable()
export class TeamCollectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
    private readonly teamService: TeamService,
  ) {}

  TITLE_LENGTH = 3;
  MAX_RETRIES = 5; // Maximum number of retries for database transactions

  /**
   * Generate a Prisma query object representation of a collection and its child collections and requests
   *
   * @param folder CollectionFolder from client
   * @param teamID The Team ID
   * @param orderIndex Initial OrderIndex of
   * @returns A Prisma query object to create a collection, its child collections and requests
   */
  private generatePrismaQueryObjForFBCollFolder(
    folder: CollectionFolder,
    teamID: string,
    orderIndex: number,
  ): Prisma.TeamCollectionCreateInput {
    return {
      title: folder.name,
      team: {
        connect: {
          id: teamID,
        },
      },
      requests: {
        create: folder.requests.map((r, index) => ({
          title: r.name,
          team: {
            connect: {
              id: teamID,
            },
          },
          request: r,
          orderIndex: index + 1,
        })),
      },
      orderIndex: orderIndex,
      children: {
        create: folder.folders.map((f, index) =>
          this.generatePrismaQueryObjForFBCollFolder(f, teamID, index + 1),
        ),
      },
      data: folder.data ?? undefined,
    };
  }

  /**
   * Generate a JSON containing all the contents of a collection
   *
   * @param teamID The Team ID
   * @param collectionID The Collection ID
   * @returns A JSON string containing all the contents of a collection
   */
  async exportCollectionToJSONObject(
    teamID: string,
    collectionID: string,
  ): Promise<E.Right<CollectionFolder> | E.Left<string>> {
    const collection = await this.getCollection(collectionID);
    if (E.isLeft(collection)) return E.left(TEAM_INVALID_COLL_ID);

    const childrenCollection = await this.prisma.teamCollection.findMany({
      where: {
        teamID,
        parentID: collectionID,
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });

    const childrenCollectionObjects = [];
    for (const coll of childrenCollection) {
      const result = await this.exportCollectionToJSONObject(teamID, coll.id);
      if (E.isLeft(result)) return E.left(result.left);

      childrenCollectionObjects.push(result.right);
    }

    const requests = await this.prisma.teamRequest.findMany({
      where: {
        teamID,
        collectionID,
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });

    const data = transformCollectionData(collection.right.data);

    const result: CollectionFolder = {
      name: collection.right.title,
      folders: childrenCollectionObjects,
      requests: requests.map((x) => x.request),
      data,
    };

    return E.right(result);
  }

  /**
   * Generate a JSON containing all the contents of collections and requests of a team
   *
   * @param teamID The Team ID
   * @returns A JSON string containing all the contents of collections and requests of a team
   */
  async exportCollectionsToJSON(teamID: string) {
    const rootCollections = await this.prisma.teamCollection.findMany({
      where: {
        teamID,
        parentID: null,
      },
    });

    const rootCollectionObjects = [];
    for (const coll of rootCollections) {
      const result = await this.exportCollectionToJSONObject(teamID, coll.id);
      if (E.isLeft(result)) return E.left(result.left);

      rootCollectionObjects.push(result.right);
    }

    return E.right(JSON.stringify(rootCollectionObjects));
  }

  /**
   * Create new TeamCollections and TeamRequests from JSON string
   *
   * @param jsonString The JSON string of the content
   * @param teamID Team ID, where the collections will be created
   * @param parentID Collection ID, where the collections will be created under
   * @returns An Either of a Boolean if the creation operation was successful
   */
  async importCollectionsFromJSON(
    jsonString: string,
    teamID: string,
    parentID: string | null,
  ) {
    // Check to see if jsonString is valid
    const collectionsList = stringToJson<CollectionFolder[]>(jsonString);
    if (E.isLeft(collectionsList)) return E.left(TEAM_COLL_INVALID_JSON);

    // Check to see if parsed jsonString is an array
    if (!Array.isArray(collectionsList.right))
      return E.left(TEAM_COLL_INVALID_JSON);

    let teamCollections: DBTeamCollection[] = [];
    let queryList: Prisma.TeamCollectionCreateInput[] = [];
    try {
      await this.prisma.$transaction(async (tx) => {
        try {
          // lock the rows
          await this.prisma.lockTableExclusive(tx, 'TeamCollection');

          // Get the last order index
          const lastEntry = await tx.teamCollection.findFirst({
            where: { teamID, parentID },
            orderBy: { orderIndex: 'desc' },
            select: { orderIndex: true },
          });
          let lastOrderIndex = lastEntry ? lastEntry.orderIndex : 0;

          // Generate Prisma Query Object for all child collections in collectionsList
          queryList = collectionsList.right.map((x) =>
            this.generatePrismaQueryObjForFBCollFolder(
              x,
              teamID,
              ++lastOrderIndex,
            ),
          );

          const promises = queryList.map((query) =>
            tx.teamCollection.create({
              data: {
                ...query,
                parent: parentID ? { connect: { id: parentID } } : undefined,
              },
            }),
          );
          teamCollections = await Promise.all(promises);
        } catch (error) {
          throw new ConflictException(error);
        }
      });
    } catch (error) {
      console.error(
        'Error from TeamCollectionService.importCollectionsFromJSON',
        error,
      );
      return E.left(TEAM_COLL_CREATION_FAILED);
    }

    teamCollections.forEach((collection) =>
      this.pubsub.publish(
        `team_coll/${teamID}/coll_added`,
        this.cast(collection),
      ),
    );

    return E.right(true);
  }

  /**
   * Typecast a database TeamCollection to a TeamCollection model
   *
   * @param teamCollection database TeamCollection
   * @returns TeamCollection model
   */
  private cast(teamCollection: DBTeamCollection): TeamCollection {
    const data = transformCollectionData(teamCollection.data);

    return <TeamCollection>{
      id: teamCollection.id,
      title: teamCollection.title,
      parentID: teamCollection.parentID,
      data,
    };
  }

  /**
   * Get Team of given Collection ID
   *
   * @param collectionID The collection ID
   * @returns Team of given Collection ID
   */
  async getTeamOfCollection(collectionID: string) {
    try {
      const teamCollection = await this.prisma.teamCollection.findUnique({
        where: {
          id: collectionID,
        },
        include: {
          team: true,
        },
      });

      return E.right(teamCollection.team);
    } catch (error) {
      return E.left(TEAM_INVALID_COLL_ID);
    }
  }

  /**
   * Get parent of given Collection ID
   *
   * @param collectionID The collection ID
   * @returns Parent TeamCollection of given Collection ID
   */
  async getParentOfCollection(collectionID: string) {
    const teamCollection = await this.prisma.teamCollection.findUnique({
      where: {
        id: collectionID,
      },
      include: {
        parent: true,
      },
    });
    if (!teamCollection) return null;

    return !teamCollection.parent ? null : this.cast(teamCollection.parent);
  }

  /**
   * Get child collections of given Collection ID
   *
   * @param collectionID The collection ID
   * @param cursor collectionID for pagination
   * @param take Number of items we want returned
   * @returns A list of child collections
   */
  async getChildrenOfCollection(
    collectionID: string,
    cursor: string | null,
    take: number,
  ) {
    const res = await this.prisma.teamCollection.findMany({
      where: {
        parentID: collectionID,
      },
      orderBy: {
        orderIndex: 'asc',
      },
      take: take, // default: 10
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const childCollections = res.map((teamCollection) =>
      this.cast(teamCollection),
    );

    return childCollections;
  }

  /**
   * Get root collections of given Collection ID
   *
   * @param teamID The Team ID
   * @param cursor collectionID for pagination
   * @param take Number of items we want returned
   * @returns A list of root TeamCollections
   */
  async getTeamRootCollections(
    teamID: string,
    cursor: string | null,
    take: number,
  ) {
    const res = await this.prisma.teamCollection.findMany({
      where: {
        teamID,
        parentID: null,
      },
      orderBy: {
        orderIndex: 'asc',
      },
      take: take, // default: 10
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });

    const teamCollections = res.map((teamCollection) =>
      this.cast(teamCollection),
    );

    return teamCollections;
  }

  /**
   * Get collection details
   *
   * @param collectionID The collection ID
   * @returns An Either of the Collection details
   */
  async getCollection(collectionID: string) {
    try {
      const teamCollection = await this.prisma.teamCollection.findUniqueOrThrow(
        {
          where: {
            id: collectionID,
          },
        },
      );
      return E.right(teamCollection);
    } catch (error) {
      return E.left(TEAM_COLL_NOT_FOUND);
    }
  }

  /**
   * Check to see if Collection belongs to Team
   *
   * @param collectionID getChildCollectionsCount
   * @param teamID The Team ID
   * @returns An Option of a Boolean
   */
  private async isOwnerCheck(collectionID: string, teamID: string) {
    try {
      await this.prisma.teamCollection.findFirstOrThrow({
        where: {
          id: collectionID,
          teamID,
        },
      });

      return O.some(true);
    } catch (error) {
      return O.none;
    }
  }

  /**
   * Create a new TeamCollection
   *
   * @param teamID The Team ID
   * @param title The title of new TeamCollection
   * @param parentID The parent collectionID (null if root collection)
   * @returns An Either of TeamCollection
   */
  async createCollection(
    teamID: string,
    title: string,
    data: string | null = null,
    parentID: string | null,
  ) {
    const isTitleValid = isValidLength(title, this.TITLE_LENGTH);
    if (!isTitleValid) return E.left(TEAM_COLL_SHORT_TITLE);

    // Check to see if parentTeamCollectionID belongs to this Team
    if (parentID !== null) {
      const isOwner = await this.isOwnerCheck(parentID, teamID);
      if (O.isNone(isOwner)) return E.left(TEAM_NOT_OWNER);
    }

    if (data === '') return E.left(TEAM_COLL_DATA_INVALID);
    if (data) {
      const jsonReq = stringToJson(data);
      if (E.isLeft(jsonReq)) return E.left(TEAM_COLL_DATA_INVALID);
      data = jsonReq.right;
    }

    let teamCollection: DBTeamCollection | null = null;
    try {
      teamCollection = await this.prisma.$transaction(async (tx) => {
        try {
          // lock the rows
          await this.prisma.lockTableExclusive(tx, 'TeamCollection');

          // fetch last collection
          const lastCollection = await tx.teamCollection.findFirst({
            where: { teamID, parentID },
            orderBy: { orderIndex: 'desc' },
            select: { orderIndex: true },
          });

          // create new collection
          return tx.teamCollection.create({
            data: {
              title,
              teamID,
              parentID: parentID ? parentID : undefined,
              data: data ?? undefined,
              orderIndex: lastCollection ? lastCollection.orderIndex + 1 : 1,
            },
          });
        } catch (error) {
          throw new ConflictException(error);
        }
      });
    } catch (error) {
      console.error('Error from TeamCollectionService.createCollection', error);
      return E.left(TEAM_COLL_CREATION_FAILED);
    }

    this.pubsub.publish(
      `team_coll/${teamID}/coll_added`,
      this.cast(teamCollection),
    );

    return E.right(this.cast(teamCollection));
  }

  /**
   * @deprecated Use updateTeamCollection method instead
   * Update the title of a TeamCollection
   *
   * @param collectionID The Collection ID
   * @param newTitle The new title of collection
   * @returns An Either of the updated TeamCollection
   */
  async renameCollection(collectionID: string, newTitle: string) {
    const isTitleValid = isValidLength(newTitle, this.TITLE_LENGTH);
    if (!isTitleValid) return E.left(TEAM_COLL_SHORT_TITLE);

    try {
      const updatedTeamCollection = await this.prisma.teamCollection.update({
        where: { id: collectionID },
        data: { title: newTitle },
      });

      this.pubsub.publish(
        `team_coll/${updatedTeamCollection.teamID}/coll_updated`,
        this.cast(updatedTeamCollection),
      );

      return E.right(this.cast(updatedTeamCollection));
    } catch (error) {
      return E.left(TEAM_COLL_NOT_FOUND);
    }
  }

  /**
   * Update the OrderIndex of all collections in given parentID
   *
   * @param collection The collection to delete
   * @param orderIndexCondition Condition to decide what collections will be updated
   * @param dataCondition Increment/Decrement OrderIndex condition
   */
  private async deleteCollectionAndUpdateSiblingsOrderIndex(
    collection: DBTeamCollection,
    orderIndexCondition: Prisma.IntFilter,
    dataCondition: Prisma.IntFieldUpdateOperationsInput,
  ) {
    let retryCount = 0;
    while (retryCount < this.MAX_RETRIES) {
      try {
        await this.prisma.$transaction(async (tx) => {
          try {
            // lock the rows
            await this.prisma.lockTableExclusive(tx, 'TeamCollection');

            await tx.teamCollection.delete({
              where: { id: collection.id },
            });

            // update siblings orderIndexes
            await tx.teamCollection.updateMany({
              where: {
                parentID: collection.parentID,
                orderIndex: orderIndexCondition,
              },
              data: { orderIndex: dataCondition },
            });
          } catch (error) {
            throw new ConflictException(error);
          }
        });

        break;
      } catch (error) {
        console.error(
          'Error from TeamCollectionService.updateOrderIndex',
          error,
        );
        retryCount++;
        if (
          retryCount >= this.MAX_RETRIES ||
          (error.code !== PrismaError.UNIQUE_CONSTRAINT_VIOLATION &&
            error.code !== PrismaError.TRANSACTION_DEADLOCK &&
            error.code !== PrismaError.TRANSACTION_TIMEOUT) // return for all DB error except deadlocks, unique constraint violations, transaction timeouts
        )
          return E.left(TEAM_COL_REORDERING_FAILED);

        await delay(retryCount * 100);
        console.debug(`Retrying updateOrderIndex... (${retryCount})`);
      }
    }

    return E.right(true);
  }

  /**
   * Delete child collection and requests of a TeamCollection
   *
   * @param collectionID The Collection Id
   * @returns A Boolean of deletion status
   */
  private async deleteCollectionData(collection: DBTeamCollection) {
    // Get all child collections in collectionID
    const childCollectionList = await this.prisma.teamCollection.findMany({
      where: {
        parentID: collection.id,
      },
    });

    // Delete child collections
    await Promise.all(
      childCollectionList.map((coll) => this.deleteCollection(coll.id)),
    );

    // Delete all requests in collectionID
    await this.prisma.teamRequest.deleteMany({
      where: {
        collectionID: collection.id,
      },
    });

    // Update orderIndexes in TeamCollection table for user
    const isDeleted = await this.deleteCollectionAndUpdateSiblingsOrderIndex(
      collection,
      { gt: collection.orderIndex },
      { decrement: 1 },
    );
    if (E.isLeft(isDeleted)) return E.left(isDeleted.left);

    this.pubsub.publish(
      `team_coll/${collection.teamID}/coll_removed`,
      collection.id,
    );

    return E.right(collection);
  }

  /**
   * Delete a TeamCollection
   *
   * @param collectionID The Collection Id
   * @returns An Either of Boolean of deletion status
   */
  async deleteCollection(collectionID: string) {
    const collection = await this.getCollection(collectionID);
    if (E.isLeft(collection)) return E.left(collection.left);

    // Delete all child collections and requests in the collection
    const collectionData = await this.deleteCollectionData(collection.right);
    if (E.isLeft(collectionData)) return E.left(collectionData.left);

    return E.right(true);
  }

  /**
   * Change parentID of TeamCollection's
   *
   * @param collection The collection that is being moved
   * @param newParentID The new parent's collection ID or change to root collection
   * @returns  If successful return an Either of collection or error message
   */
  private async changeParentAndUpdateOrderIndex(
    collection: DBTeamCollection,
    newParentID: string | null,
  ) {
    let updatedCollection: DBTeamCollection = null;

    try {
      await this.prisma.$transaction(async (tx) => {
        try {
          // fetch last collection
          const lastCollectionUnderNewParent =
            await tx.teamCollection.findFirst({
              where: { teamID: collection.teamID, parentID: newParentID },
              orderBy: { orderIndex: 'desc' },
            });

          // decrement orderIndex of all next sibling collections from original collection
          await tx.teamCollection.updateMany({
            where: {
              teamID: collection.teamID,
              parentID: collection.parentID,
              orderIndex: { gt: collection.orderIndex },
            },
            data: {
              orderIndex: { decrement: 1 },
            },
          });

          // update collection's parentID and orderIndex
          updatedCollection = await tx.teamCollection.update({
            where: { id: collection.id },
            data: {
              // if parentCollectionID == null, collection becomes root collection
              // if parentCollectionID != null, collection becomes child collection
              parentID: newParentID,
              orderIndex: lastCollectionUnderNewParent
                ? lastCollectionUnderNewParent.orderIndex + 1
                : 1,
            },
          });
        } catch (error) {
          throw new ConflictException(error);
        }
      });

      return E.right(this.cast(updatedCollection));
    } catch (error) {
      console.error(
        'Error from TeamCollectionService.changeParentAndUpdateOrderIndex',
        error,
      );
      return E.left(TEAM_COLL_NOT_FOUND);
    }
  }

  /**
   * Check if collection is parent of destCollection
   *
   * @param collection The ID of collection being moved
   * @param destCollection The ID of collection into which we are moving target collection into
   * @returns An Option of boolean, is parent or not
   */
  private async isParent(
    collection: DBTeamCollection,
    destCollection: DBTeamCollection,
  ): Promise<O.Option<boolean>> {
    //* Recursively check if collection is a parent by going up the tree of child-parent collections until we reach a root collection i.e parentID === null
    //* Valid condition, isParent returns false
    //* Consider us moving Collection_E into Collection_D
    //* Collection_A              [parent:null !== Collection_E] return false, exit
    //*   |--> Collection_B       [parent:Collection_A !== Collection_E] call isParent(Collection_E,Collection_A)
    //*      |--> Collection_C    [parent:Collection_B !== Collection_E] call isParent(Collection_E,Collection_B)
    //*         |--> Collection_D [parent:Collection_C !== Collection_E] call isParent(Collection_E,Collection_C)
    //* Invalid condition, isParent returns true
    //* Consider us moving Collection_B into Collection_D
    //* Collection_A
    //*   |--> Collection_B
    //*      |--> Collection_C    [parent:Collection_B === Collection_B] return true, exit
    //*         |--> Collection_D [parent:Collection_C !== Collection_B] call isParent(Collection_B,Collection_C)

    // Check if collection and destCollection are same
    if (collection === destCollection) {
      return O.none;
    }
    if (destCollection.parentID !== null) {
      // Check if ID of collection is same as parent of destCollection
      if (destCollection.parentID === collection.id) {
        return O.none;
      }
      // Get collection details of collection one step above in the tree i.e the parent collection
      const parentCollection = await this.getCollection(
        destCollection.parentID,
      );
      if (E.isLeft(parentCollection)) {
        return O.none;
      }
      // Call isParent again now with parent collection
      return await this.isParent(collection, parentCollection.right);
    } else {
      return O.some(true);
    }
  }

  /**
   * Move TeamCollection into root or another collection
   *
   * @param collectionID The ID of collection being moved
   * @param destCollectionID The ID of collection the target collection is being moved into or move target collection to root
   * @returns An Either of the moved TeamCollection
   */
  async moveCollection(collectionID: string, destCollectionID: string | null) {
    // Get collection details of collectionID
    const collection = await this.getCollection(collectionID);
    if (E.isLeft(collection)) return E.left(collection.left);

    // destCollectionID == null i.e move collection to root
    if (!destCollectionID) {
      if (!collection.right.parentID) {
        // collection is a root collection
        // Throw error if collection is already a root collection
        return E.left(TEAM_COL_ALREADY_ROOT);
      }

      // Change parent from child to root i.e child collection becomes a root collection
      // Move child collection into root and update orderIndexes for root teamCollections
      const updatedCollection = await this.changeParentAndUpdateOrderIndex(
        collection.right,
        null,
      );
      if (E.isLeft(updatedCollection)) return E.left(updatedCollection.left);

      this.pubsub.publish(
        `team_coll/${collection.right.teamID}/coll_moved`,
        updatedCollection.right,
      );

      return E.right(updatedCollection.right);
    }

    // destCollectionID != null i.e move into another collection
    if (collectionID === destCollectionID) {
      // Throw error if collectionID and destCollectionID are the same
      return E.left(TEAM_COLL_DEST_SAME);
    }

    // Get collection details of destCollectionID
    const destCollection = await this.getCollection(destCollectionID);
    if (E.isLeft(destCollection)) return E.left(TEAM_COLL_NOT_FOUND);

    // Check if collection and destCollection belong to the same user account
    if (collection.right.teamID !== destCollection.right.teamID) {
      return E.left(TEAM_COLL_NOT_SAME_TEAM);
    }

    // Check if collection is present on the parent tree for destCollection
    const checkIfParent = await this.isParent(
      collection.right,
      destCollection.right,
    );
    if (O.isNone(checkIfParent)) {
      return E.left(TEAM_COLL_IS_PARENT_COLL);
    }

    // Change parent from null to teamCollection i.e collection becomes a child collection
    // Move root/child collection into another child collection and update orderIndexes of the previous parent
    const updatedCollection = await this.changeParentAndUpdateOrderIndex(
      collection.right,
      destCollection.right.id,
    );
    if (E.isLeft(updatedCollection)) return E.left(updatedCollection.left);

    this.pubsub.publish(
      `team_coll/${collection.right.teamID}/coll_moved`,
      updatedCollection.right,
    );

    return E.right(updatedCollection.right);
  }

  /**
   * Find the number of child collections present in collectionID
   *
   * @param collectionID The Collection ID
   * @returns Number of collections
   */
  getCollectionCount(collectionID: string): Promise<number> {
    return this.prisma.teamCollection.count({
      where: { parentID: collectionID },
    });
  }

  /**
   * Update order of root or child collectionID's
   *
   * @param collectionID The ID of collection being re-ordered
   * @param nextCollectionID The ID of collection that is after the moved collection in its new position
   * @returns If successful return an Either of true
   */
  async updateCollectionOrder(
    collectionID: string,
    nextCollectionID: string | null,
  ) {
    // Throw error if collectionID and nextCollectionID are the same
    if (collectionID === nextCollectionID)
      return E.left(TEAM_COL_SAME_NEXT_COLL);

    // Get collection details of collectionID
    const collection = await this.getCollection(collectionID);
    if (E.isLeft(collection)) return E.left(collection.left);

    if (!nextCollectionID) {
      // nextCollectionID == null i.e move collection to the end of the list
      try {
        await this.prisma.$transaction(async (tx) => {
          try {
            // Step 0: lock the rows
            await this.prisma.acquireLocks(
              tx,
              'TeamCollection',
              null,
              collectionID,
            );

            // Step 1: Decrement orderIndex of all items that come after collection.orderIndex till end of list of items
            const collectionInTx = await tx.teamCollection.findFirst({
              where: { id: collection.right.id },
              select: { orderIndex: true },
            });
            await tx.teamCollection.updateMany({
              where: {
                parentID: collection.right.parentID,
                orderIndex: {
                  gte: collectionInTx.orderIndex + 1,
                },
              },
              data: {
                orderIndex: { decrement: 1 },
              },
            });

            // Step 2: Update orderIndex of collection to length of list
            await tx.teamCollection.update({
              where: { id: collection.right.id },
              data: {
                orderIndex: await this.getCollectionCount(
                  collection.right.parentID,
                ),
              },
            });
          } catch (error) {
            throw new ConflictException(error);
          }
        });

        this.pubsub.publish(
          `team_coll/${collection.right.teamID}/coll_order_updated`,
          {
            collection: this.cast(collection.right),
            nextCollection: null,
          },
        );

        return E.right(true);
      } catch (error) {
        return E.left(TEAM_COL_REORDERING_FAILED);
      }
    }

    // nextCollectionID != null i.e move to a certain position
    // Get collection details of nextCollectionID
    const subsequentCollection = await this.getCollection(nextCollectionID);
    if (E.isLeft(subsequentCollection)) return E.left(TEAM_COLL_NOT_FOUND);

    // Check if collection and subsequentCollection belong to the same collection team
    if (collection.right.teamID !== subsequentCollection.right.teamID)
      return E.left(TEAM_COLL_NOT_SAME_TEAM);

    try {
      await this.prisma.$transaction(async (tx) => {
        try {
          // Step 0: lock the rows
          await this.prisma.acquireLocks(
            tx,
            'TeamCollection',
            null,
            collection.right.parentID,
          );

          // Step 1: Determine if we are moving collection up or down the list
          const collectionInTx = await tx.teamCollection.findFirst({
            where: { id: collectionID },
            select: { orderIndex: true },
          });
          const subsequentCollectionInTx = await tx.teamCollection.findFirst({
            where: { id: nextCollectionID },
            select: { orderIndex: true },
          });
          const isMovingUp =
            subsequentCollectionInTx.orderIndex < collectionInTx.orderIndex;

          // Step 2: Update OrderIndex of items in list depending on moving up or down
          const updateFrom = isMovingUp
            ? subsequentCollectionInTx.orderIndex
            : collectionInTx.orderIndex + 1;

          const updateTo = isMovingUp
            ? collectionInTx.orderIndex - 1
            : subsequentCollectionInTx.orderIndex - 1;

          await tx.teamCollection.updateMany({
            where: {
              parentID: collection.right.parentID,
              orderIndex: { gte: updateFrom, lte: updateTo },
            },
            data: {
              orderIndex: isMovingUp ? { increment: 1 } : { decrement: 1 },
            },
          });

          // Step 3: Update OrderIndex of collection
          await tx.teamCollection.update({
            where: { id: collection.right.id },
            data: {
              orderIndex: isMovingUp
                ? subsequentCollectionInTx.orderIndex
                : subsequentCollectionInTx.orderIndex - 1,
            },
          });
        } catch (error) {
          throw new ConflictException(error);
        }
      });

      this.pubsub.publish(
        `team_coll/${collection.right.teamID}/coll_order_updated`,
        {
          collection: this.cast(collection.right),
          nextCollection: this.cast(subsequentCollection.right),
        },
      );

      return E.right(true);
    } catch (error) {
      return E.left(TEAM_COL_REORDERING_FAILED);
    }
  }

  /**
   * Fetch list of all the Team Collections in DB for a particular team
   * @param teamID Team ID
   * @returns number of Team Collections in the DB
   */
  async totalCollectionsInTeam(teamID: string) {
    const collCount = await this.prisma.teamCollection.count({
      where: {
        teamID: teamID,
      },
    });

    return collCount;
  }

  /**
   * Fetch list of all the Team Collections in DB
   *
   * @returns number of Team Collections in the DB
   */
  async getTeamCollectionsCount() {
    const teamCollectionsCount = this.prisma.teamCollection.count();
    return teamCollectionsCount;
  }

  /**
   * Update Team Collection details
   *
   * @param collectionID Collection ID
   * @param collectionData new header data in a JSONified string form
   * @param newTitle New title of the collection
   * @returns Updated TeamCollection
   */
  async updateTeamCollection(
    collectionID: string,
    collectionData: string = null,
    newTitle: string = null,
  ) {
    try {
      if (newTitle != null) {
        const isTitleValid = isValidLength(newTitle, this.TITLE_LENGTH);
        if (!isTitleValid) return E.left(TEAM_COLL_SHORT_TITLE);
      }

      if (collectionData === '') return E.left(TEAM_COLL_DATA_INVALID);
      if (collectionData) {
        const jsonReq = stringToJson(collectionData);
        if (E.isLeft(jsonReq)) return E.left(TEAM_COLL_DATA_INVALID);
        collectionData = jsonReq.right;
      }

      const updatedTeamCollection = await this.prisma.teamCollection.update({
        where: { id: collectionID },
        data: {
          data: collectionData ?? undefined,
          title: newTitle ?? undefined,
        },
      });

      this.pubsub.publish(
        `team_coll/${updatedTeamCollection.teamID}/coll_updated`,
        this.cast(updatedTeamCollection),
      );

      return E.right(this.cast(updatedTeamCollection));
    } catch (e) {
      return E.left(TEAM_COLL_NOT_FOUND);
    }
  }

  /**
   * Search for TeamCollections and TeamRequests by title
   *
   * @param searchQuery The search query
   * @param teamID The Team ID
   * @param take Number of items we want returned
   * @param skip Number of items we want to skip
   * @returns An Either of the search results
   */
  async searchByTitle(
    searchQuery: string,
    teamID: string,
    take = 10,
    skip = 0,
  ) {
    // Fetch all collections and requests that match the search query
    const searchResults: SearchQueryReturnType[] = [];

    const matchedCollections = await this.searchCollections(
      searchQuery,
      teamID,
      take,
      skip,
    );
    if (E.isLeft(matchedCollections))
      return E.left(<RESTError>{
        message: matchedCollections.left,
        statusCode: HttpStatus.NOT_FOUND,
      });
    searchResults.push(...matchedCollections.right);

    const matchedRequests = await this.searchRequests(
      searchQuery,
      teamID,
      take,
      skip,
    );
    if (E.isLeft(matchedRequests))
      return E.left(<RESTError>{
        message: matchedRequests.left,
        statusCode: HttpStatus.NOT_FOUND,
      });
    searchResults.push(...matchedRequests.right);

    // Generate the parent tree for searchResults
    const searchResultsWithTree: CollectionSearchNode[] = [];

    for (let i = 0; i < searchResults.length; i++) {
      const fetchedParentTree = await this.fetchParentTree(searchResults[i]);
      if (E.isLeft(fetchedParentTree))
        return E.left(<RESTError>{
          message: fetchedParentTree.left,
          statusCode: HttpStatus.NOT_FOUND,
        });
      searchResultsWithTree.push({
        type: searchResults[i].type,
        title: searchResults[i].title,
        method: searchResults[i].method,
        id: searchResults[i].id,
        path: !fetchedParentTree
          ? []
          : (fetchedParentTree.right as CollectionSearchNode[]),
      });
    }

    return E.right({ data: searchResultsWithTree });
  }

  /**
   * Search for TeamCollections by title
   *
   * @param searchQuery The search query
   * @param teamID The Team ID
   * @param take Number of items we want returned
   * @param skip Number of items we want to skip
   * @returns An Either of the search results
   */
  private async searchCollections(
    searchQuery: string,
    teamID: string,
    take: number,
    skip: number,
  ) {
    const query = Prisma.sql`
    SELECT
      id,title,'collection' AS type
    FROM
      "TeamCollection"
    WHERE
      "TeamCollection"."teamID"=${teamID}
      AND
        title ILIKE ${`%${escapeSqlLikeString(searchQuery)}%`}
    ORDER BY
      similarity(title, ${searchQuery})
    LIMIT ${take}
    OFFSET ${skip === 0 ? 0 : (skip - 1) * take};
  `;

    try {
      const res = await this.prisma.$queryRaw<SearchQueryReturnType[]>(query);
      return E.right(res);
    } catch (error) {
      return E.left(TEAM_COL_SEARCH_FAILED);
    }
  }

  /**
   * Search for TeamRequests by title
   *
   * @param searchQuery The search query
   * @param teamID The Team ID
   * @param take Number of items we want returned
   * @param skip Number of items we want to skip
   * @returns An Either of the search results
   */
  private async searchRequests(
    searchQuery: string,
    teamID: string,
    take: number,
    skip: number,
  ) {
    const query = Prisma.sql`
    SELECT
      id,title,request->>'method' as method,'request' AS type
    FROM
      "TeamRequest"
    WHERE
      "TeamRequest"."teamID"=${teamID}
      AND
        title ILIKE ${`%${escapeSqlLikeString(searchQuery)}%`}
    ORDER BY
      similarity(title, ${searchQuery})
    LIMIT ${take}
    OFFSET ${skip === 0 ? 0 : (skip - 1) * take};
  `;

    try {
      const res = await this.prisma.$queryRaw<SearchQueryReturnType[]>(query);
      return E.right(res);
    } catch (error) {
      return E.left(TEAM_REQ_SEARCH_FAILED);
    }
  }

  /**
   * Generate the parent tree of a search result
   *
   * @param searchResult The search result for which we want to generate the parent tree
   * @returns The parent tree of the search result
   */
  private async fetchParentTree(searchResult: SearchQueryReturnType) {
    return searchResult.type === 'collection'
      ? await this.fetchCollectionParentTree(searchResult.id)
      : await this.fetchRequestParentTree(searchResult.id);
  }

  /**
   * Generate the parent tree of a collection
   *
   * @param id The ID of the collection
   * @returns The parent tree of the collection
   */
  private async fetchCollectionParentTree(id: string) {
    try {
      const query = Prisma.sql`
      WITH RECURSIVE collection_tree AS (
        SELECT tc.id, tc."parentID", tc.title
        FROM "TeamCollection" AS tc
        JOIN "TeamCollection" AS tr ON tc.id = tr."parentID"
        WHERE tr.id = ${id}

        UNION ALL

        SELECT parent.id,  parent."parentID", parent.title
        FROM "TeamCollection" AS parent
        JOIN collection_tree AS ct ON parent.id = ct."parentID"
      )
      SELECT * FROM collection_tree;
      `;
      const res =
        await this.prisma.$queryRaw<ParentTreeQueryReturnType[]>(query);

      const collectionParentTree = this.generateParentTree(res);
      return E.right(collectionParentTree);
    } catch (error) {
      E.left(TEAM_COLL_PARENT_TREE_GEN_FAILED);
    }
  }

  /**
   * Generate the parent tree from the collections
   *
   * @param parentCollections The parent collections
   * @returns The parent tree of the parent collections
   */
  private generateParentTree(parentCollections: ParentTreeQueryReturnType[]) {
    function findChildren(id: string): CollectionSearchNode[] {
      const collection = parentCollections.filter((item) => item.id === id)[0];
      if (collection.parentID == null) {
        return <CollectionSearchNode[]>[
          {
            id: collection.id,
            title: collection.title,
            type: 'collection' as const,
            path: [],
          },
        ];
      }

      const res = <CollectionSearchNode[]>[
        {
          id: collection.id,
          title: collection.title,
          type: 'collection' as const,
          path: findChildren(collection.parentID),
        },
      ];
      return res;
    }

    if (parentCollections.length > 0) {
      if (parentCollections[0].parentID == null) {
        return <CollectionSearchNode[]>[
          {
            id: parentCollections[0].id,
            title: parentCollections[0].title,
            type: 'collection',
            path: [],
          },
        ];
      }

      return <CollectionSearchNode[]>[
        {
          id: parentCollections[0].id,
          title: parentCollections[0].title,
          type: 'collection',
          path: findChildren(parentCollections[0].parentID),
        },
      ];
    }

    return <CollectionSearchNode[]>[];
  }

  /**
   * Generate the parent tree of a request
   *
   * @param id The ID of the request
   * @returns The parent tree of the request
   */
  private async fetchRequestParentTree(id: string) {
    try {
      const query = Prisma.sql`
      WITH RECURSIVE request_collection_tree AS (
        SELECT tc.id, tc."parentID", tc.title
        FROM "TeamCollection" AS tc
        JOIN "TeamRequest" AS tr ON tc.id = tr."collectionID"
        WHERE tr.id = ${id}

        UNION ALL

        SELECT parent.id, parent."parentID", parent.title
        FROM "TeamCollection" AS parent
        JOIN request_collection_tree AS ct ON parent.id = ct."parentID"
      )
      SELECT * FROM request_collection_tree;

      `;
      const res =
        await this.prisma.$queryRaw<ParentTreeQueryReturnType[]>(query);

      const requestParentTree = this.generateParentTree(res);
      return E.right(requestParentTree);
    } catch (error) {
      return E.left(TEAM_REQ_PARENT_TREE_GEN_FAILED);
    }
  }

  /**
   * Get all requests in a collection
   *
   * @param collectionID The Collection ID
   * @returns A list of all requests in the collection
   */
  private async getAllRequestsInCollection(collectionID: string) {
    const dbTeamRequests = await this.prisma.teamRequest.findMany({
      where: {
        collectionID: collectionID,
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });

    const teamRequests = dbTeamRequests.map((tr) => {
      return <TeamRequest>{
        id: tr.id,
        collectionID: tr.collectionID,
        teamID: tr.teamID,
        title: tr.title,
        request: JSON.stringify(tr.request),
      };
    });

    return teamRequests;
  }

  /**
   * Get Collection Tree for CLI
   *
   * @param parentID The parent Collection ID
   * @returns Collection tree for CLI
   */
  private async getCollectionTreeForCLI(parentID: string | null) {
    const childCollections = await this.prisma.teamCollection.findMany({
      where: { parentID },
      orderBy: { orderIndex: 'asc' },
    });

    const response: GetCollectionResponse[] = [];

    for (const collection of childCollections) {
      const folder: GetCollectionResponse = {
        id: collection.id,
        data: collection.data === null ? null : JSON.stringify(collection.data),
        title: collection.title,
        parentID: collection.parentID,
        folders: await this.getCollectionTreeForCLI(collection.id),
        requests: await this.getAllRequestsInCollection(collection.id),
      };

      response.push(folder);
    }

    return response;
  }

  /**
   * Get Collection for CLI
   *
   * @param collectionID The Collection ID
   * @param userUid The User UID
   * @returns An Either of the Collection details
   */
  async getCollectionForCLI(collectionID: string, userUid: string) {
    try {
      const collection = await this.prisma.teamCollection.findUniqueOrThrow({
        where: { id: collectionID },
      });

      const teamMember = await this.teamService.getTeamMember(
        collection.teamID,
        userUid,
      );
      if (!teamMember) return E.left(TEAM_MEMBER_NOT_FOUND);

      return E.right(<GetCollectionResponse>{
        id: collection.id,
        data: collection.data === null ? null : JSON.stringify(collection.data),
        title: collection.title,
        parentID: collection.parentID,
        folders: await this.getCollectionTreeForCLI(collection.id),
        requests: await this.getAllRequestsInCollection(collection.id),
      });
    } catch (error) {
      return E.left(TEAM_COLL_NOT_FOUND);
    }
  }

  /**
   * Duplicate a Team Collection
   *
   * @param collectionID The Collection ID
   * @returns Boolean of duplication status
   */
  async duplicateTeamCollection(collectionID: string) {
    const collection = await this.getCollection(collectionID);
    if (E.isLeft(collection)) return E.left(TEAM_INVALID_COLL_ID);

    const collectionJSONObject = await this.exportCollectionToJSONObject(
      collection.right.teamID,
      collectionID,
    );
    if (E.isLeft(collectionJSONObject)) return E.left(TEAM_INVALID_COLL_ID);

    const result = await this.importCollectionsFromJSON(
      JSON.stringify([
        {
          ...collectionJSONObject.right,
          name: `${collection.right.title} - Duplicate`,
        },
      ]),
      collection.right.teamID,
      collection.right.parentID,
    );
    if (E.isLeft(result)) return E.left(result.left as string);

    return E.right(true);
  }
}
