import { Injectable } from '@nestjs/common';
import {
  USER_COLL_DEST_SAME,
  USER_COLL_IS_PARENT_COLL,
  USER_COLL_NOT_FOUND,
  USER_COLL_NOT_SAME_TYPE,
  USER_COLL_NOT_SAME_USER,
  USER_COLL_REORDERING_FAILED,
  USER_COLL_SAME_NEXT_COLL,
  USER_COLL_SHORT_TITLE,
  USER_COL_ALREADY_ROOT,
  USER_NOT_FOUND,
  USER_NOT_OWNER,
} from 'src/errors';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthUser } from 'src/types/AuthUser';
import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { PubSubService } from 'src/pubsub/pubsub.service';
import { Prisma, User, UserCollection } from '@prisma/client';
import { UserCollection as UserCollectionModel } from './user-collections.model';
import { ReqType } from 'src/types/RequestTypes';
import { isValidLength } from 'src/utils';
@Injectable()
export class UserCollectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pubsub: PubSubService,
  ) {}

  private cast(collection: UserCollection) {
    return <UserCollectionModel>{
      ...collection,
      userID: collection.userUid,
    };
  }

  private async getChildCollectionsCount(collectionID: string) {
    const childCollectionCount = await this.prisma.userCollection.findMany({
      where: { parentID: collectionID },
      orderBy: {
        orderIndex: 'desc',
      },
    });
    if (!childCollectionCount.length) return 0;
    return childCollectionCount[0].orderIndex;
  }

  private async getRootCollectionsCount(userID: string) {
    const rootCollectionCount = await this.prisma.userCollection.findMany({
      where: { userUid: userID, parentID: null },
      orderBy: {
        orderIndex: 'desc',
      },
    });
    if (!rootCollectionCount.length) return 0;
    return rootCollectionCount[0].orderIndex;
  }

  private async isOwnerCheck(collectionID: string, userID: string) {
    try {
      await this.prisma.userCollection.findFirstOrThrow({
        where: {
          id: collectionID,
          userUid: userID,
        },
      });

      return O.some(true);
    } catch (error) {
      return O.none;
    }
  }

  async getUserOfCollection(collectionID: string) {
    try {
      const userCollection = await this.prisma.userCollection.findUniqueOrThrow(
        {
          where: {
            id: collectionID,
          },
          include: {
            user: true,
          },
        },
      );
      return E.right(userCollection.user);
    } catch (error) {
      return E.left(USER_NOT_FOUND);
    }
  }

  async getParentOfUserCollection(collectionID: string) {
    const { parent } = await this.prisma.userCollection.findUnique({
      where: {
        id: collectionID,
      },
      include: {
        parent: true,
      },
    });

    return parent;
  }

  async getChildrenOfUserCollection(
    collectionID: string,
    cursor: string | null,
    take: number,
    type: ReqType,
  ) {
    return this.prisma.userCollection.findMany({
      where: {
        parentID: collectionID,
        type: type,
      },
      orderBy: {
        orderIndex: 'asc',
      },
      take: take, // default: 10
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });
  }

  async getUserCollection(collectionID: string) {
    try {
      const userCollection = await this.prisma.userCollection.findUniqueOrThrow(
        {
          where: {
            id: collectionID,
          },
        },
      );
      return E.right(userCollection);
    } catch (error) {
      return E.left(USER_COLL_NOT_FOUND);
    }
  }

  async createUserCollection(
    user: AuthUser,
    title: string,
    parentUserCollectionID: string | null,
    type: ReqType,
  ) {
    const isTitleValid = isValidLength(title, 3);
    if (!isTitleValid) return E.left(USER_COLL_SHORT_TITLE);

    if (parentUserCollectionID !== null) {
      const isOwner = await this.isOwnerCheck(parentUserCollectionID, user.uid);
      if (O.isNone(isOwner)) return E.left(USER_NOT_OWNER);
    }

    const isParent = parentUserCollectionID
      ? {
          connect: {
            id: parentUserCollectionID,
          },
        }
      : undefined;

    const userCollection = await this.prisma.userCollection.create({
      data: {
        title: title,
        type: type,
        user: {
          connect: {
            uid: user.uid,
          },
        },
        parent: isParent,
        orderIndex: !parentUserCollectionID
          ? (await this.getRootCollectionsCount(user.uid)) + 1
          : (await this.getChildCollectionsCount(parentUserCollectionID)) + 1,
      },
    });

    await this.pubsub.publish(`user_coll/${user.uid}/created`, userCollection);

    return E.right(userCollection);
  }

  async getUserRootCollections(
    user: AuthUser,
    cursor: string | null,
    take: number,
    type: ReqType,
  ) {
    return this.prisma.userCollection.findMany({
      where: {
        userUid: user.uid,
        parentID: null,
        type: type,
      },
      orderBy: {
        orderIndex: 'asc',
      },
      take: take, // default: 10
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });
  }

  async getUserChildCollections(
    user: AuthUser,
    userCollectionID: string,
    cursor: string | null,
    take: number,
    type: ReqType,
  ) {
    return this.prisma.userCollection.findMany({
      where: {
        userUid: user.uid,
        parentID: userCollectionID,
        type: type,
      },
      take: take, // default: 10
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    });
  }

  async renameCollection(
    newTitle: string,
    userCollectionID: string,
    userID: string,
  ) {
    const isTitleValid = isValidLength(newTitle, 3);
    if (!isTitleValid) return E.left(USER_COLL_SHORT_TITLE);

    // Check to see is the collection belongs to the user
    const isOwner = await this.isOwnerCheck(userCollectionID, userID);
    if (O.isNone(isOwner)) return E.left(USER_NOT_OWNER);

    try {
      const updatedUserCollection = await this.prisma.userCollection.update({
        where: {
          id: userCollectionID,
        },
        data: {
          title: newTitle,
        },
      });

      this.pubsub.publish(
        `user_coll/${updatedUserCollection.userUid}/updated`,
        updatedUserCollection,
      );

      return E.right(updatedUserCollection);
    } catch (error) {
      return E.left(USER_COLL_NOT_FOUND);
    }
  }

  private async removeUserCollection(collectionID: string) {
    try {
      const deletedUserCollection = await this.prisma.userCollection.delete({
        where: {
          id: collectionID,
        },
      });

      return E.right(deletedUserCollection);
    } catch (error) {
      return E.left(USER_COLL_NOT_FOUND);
    }
  }

  private async deleteCollectionData(collection: UserCollection) {
    // Get all child collections in collectionID
    const childCollectionList = await this.prisma.userCollection.findMany({
      where: {
        parentID: collection.id,
      },
    });

    // Delete child collections
    await Promise.all(
      childCollectionList.map((coll) =>
        this.deleteUserCollection(coll.id, coll.userUid),
      ),
    );

    // Delete all requests in collectionID
    await this.prisma.userRequest.deleteMany({
      where: {
        collectionID: collection.id,
      },
    });

    // Update orderIndexes in userCollection table for user
    await this.updateOrderIndex(
      collection.parentID,
      { gt: collection.orderIndex },
      { decrement: 1 },
    );

    // Delete collection from UserCollection table
    const deletedUserCollection = await this.removeUserCollection(
      collection.id,
    );
    if (E.isLeft(deletedUserCollection))
      return E.left(deletedUserCollection.left);

    this.pubsub.publish(
      `user_coll/${deletedUserCollection.right.userUid}/deleted`,
      deletedUserCollection.right.id,
    );

    return E.right(true);
  }

  async deleteUserCollection(collectionID: string, userID: string) {
    // Get collection details of collectionID
    const collection = await this.getUserCollection(collectionID);
    if (E.isLeft(collection)) return E.left(USER_COLL_NOT_FOUND);

    // Check to see is the collection belongs to the user
    if (collection.right.userUid !== userID) return E.left(USER_NOT_OWNER);

    // Delete all child collections and requests in the collection
    const collectionData = await this.deleteCollectionData(collection.right);
    if (E.isLeft(collectionData)) return E.left(collectionData.left);

    return E.right(true);
  }

  private async changeParent(
    collection: UserCollection,
    parentCollectionID: string | null,
  ) {
    try {
      let collectionCount: number;

      if (!parentCollectionID)
        collectionCount = await this.getRootCollectionsCount(
          collection.userUid,
        );
      collectionCount = await this.getChildCollectionsCount(parentCollectionID);

      const updatedCollection = await this.prisma.userCollection.update({
        where: {
          id: collection.id,
        },
        data: {
          // if parentCollectionID == null, collection becomes root collection
          // if parentCollectionID != null, collection becomes child collection
          parentID: parentCollectionID,
          orderIndex: collectionCount + 1,
        },
      });

      return E.right(updatedCollection);
    } catch (error) {
      return E.left(USER_COLL_NOT_FOUND);
    }
  }

  private async isParent(
    collection: UserCollection,
    destCollection: UserCollection,
  ): Promise<O.Option<boolean>> {
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
      const parentCollection = await this.getUserCollection(
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

  private async updateOrderIndex(
    parentID: string,
    orderIndexCondition: Prisma.IntFilter,
    dataCondition: Prisma.IntFieldUpdateOperationsInput,
  ) {
    const updatedUserCollection = await this.prisma.userCollection.updateMany({
      where: {
        parentID: parentID,
        orderIndex: orderIndexCondition,
      },
      data: { orderIndex: dataCondition },
    });

    return updatedUserCollection;
  }

  async moveUserCollection(
    userCollectionID: string,
    destCollectionID: string | null,
    userID: string,
  ) {
    // Get collection details of collectionID
    const collection = await this.getUserCollection(userCollectionID);
    if (E.isLeft(collection)) return E.left(USER_COLL_NOT_FOUND);

    // Check to see is the collection belongs to the user
    if (collection.right.userUid !== userID) return E.left(USER_NOT_OWNER);

    // destCollectionID == null i.e move collection to root
    if (!destCollectionID) {
      if (!collection.right.parentID) {
        // collection is a root collection
        // Throw error if collection is already a root collection
        return E.left(USER_COL_ALREADY_ROOT);
      }
      // Move child collection into root and update orderIndexes for root userCollections
      await this.updateOrderIndex(
        collection.right.parentID,
        { gt: collection.right.orderIndex },
        { decrement: 1 },
      );

      // Change parent from child to root i.e child collection becomes a root collection
      const updatedCollection = await this.changeParent(collection.right, null);
      if (E.isLeft(updatedCollection)) return E.left(updatedCollection.left);

      this.pubsub.publish(
        `user_coll/${collection.right.userUid}/moved`,
        updatedCollection.right,
      );

      return E.right(updatedCollection.right);
    }

    // destCollectionID != null i.e move into another collection
    if (userCollectionID === destCollectionID) {
      // Throw error if collectionID and destCollectionID are the same
      return E.left(USER_COLL_DEST_SAME);
    }

    // Get collection details of destCollectionID
    const destCollection = await this.getUserCollection(destCollectionID);
    if (E.isLeft(destCollection)) return E.left(USER_COLL_NOT_FOUND);

    // Check if collection and destCollection belong to the same collection type
    if (collection.right.type !== destCollection.right.type) {
      return E.left(USER_COLL_NOT_SAME_TYPE);
    }

    // Check if collection and destCollection belong to the same user account
    if (collection.right.userUid !== destCollection.right.userUid) {
      return E.left(USER_COLL_NOT_SAME_USER);
    }

    // Check if collection is present on the parent tree for destCollection
    const checkIfParent = await this.isParent(
      collection.right,
      destCollection.right,
    );
    if (O.isNone(checkIfParent)) {
      return E.left(USER_COLL_IS_PARENT_COLL);
    }

    // Move root/child collection into another child collection and update orderIndexes of the previous parent
    await this.updateOrderIndex(
      collection.right.parentID,
      { gt: collection.right.orderIndex },
      { decrement: 1 },
    );

    // Change parent from null to teamCollection i.e collection becomes a child collection
    const updatedCollection = await this.changeParent(
      collection.right,
      destCollection.right.id,
    );
    if (E.isLeft(updatedCollection)) return E.left(updatedCollection.left);

    this.pubsub.publish(
      `user_coll/${collection.right.userUid}/moved`,
      updatedCollection.right,
    );

    return E.right(updatedCollection.right);
  }

  getCollectionCount(collectionID: string): Promise<number> {
    return this.prisma.userCollection.count({
      where: { parentID: collectionID },
    });
  }

  async updateUserCollectionOrder(
    collectionID: string,
    nextCollectionID: string | null,
    userID: string,
  ) {
    // Throw error if collectionID and nextCollectionID are the same
    if (collectionID === nextCollectionID)
      return E.left(USER_COLL_SAME_NEXT_COLL);

    // Get collection details of collectionID
    const collection = await this.getUserCollection(collectionID);
    if (E.isLeft(collection)) return E.left(USER_COLL_NOT_FOUND);

    // Check to see is the collection belongs to the user
    if (collection.right.userUid !== userID) return E.left(USER_NOT_OWNER);

    if (!nextCollectionID) {
      // nextCollectionID == null i.e move collection to the end of the list
      try {
        await this.prisma.$transaction(async (tx) => {
          // Step 1: Decrement orderIndex of all items that come after collection.orderIndex till end of list of items
          await tx.userCollection.updateMany({
            where: {
              parentID: collection.right.parentID,
              orderIndex: {
                gte: collection.right.orderIndex + 1,
              },
            },
            data: {
              orderIndex: { decrement: 1 },
            },
          });
          // Step 2: Update orderIndex of collection to length of list
          const updatedUserCollection = await tx.userCollection.update({
            where: { id: collection.right.id },
            data: {
              orderIndex: await this.getCollectionCount(
                collection.right.parentID,
              ),
            },
          });
        });

        this.pubsub.publish(
          `user_coll/${collection.right.userUid}/order_updated`,
          {
            userCollection: this.cast(collection.right),
            nextUserCollection: null,
          },
        );

        return E.right(true);
      } catch (error) {
        return E.left(USER_COLL_REORDERING_FAILED);
      }
    }

    // nextCollectionID != null i.e move to a certain position
    // Get collection details of nextCollectionID
    const subsequentCollection = await this.getUserCollection(nextCollectionID);
    if (E.isLeft(subsequentCollection)) return E.left(USER_COLL_NOT_FOUND);

    if (collection.right.userUid !== subsequentCollection.right.userUid)
      return E.left(USER_COLL_NOT_SAME_USER);

    // Check if collection and subsequentCollection belong to the same collection type
    if (collection.right.type !== subsequentCollection.right.type) {
      return E.left(USER_COLL_NOT_SAME_TYPE);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // Step 1: Determine if we are moving collection up or down the list
        const isMovingUp =
          subsequentCollection.right.orderIndex < collection.right.orderIndex;
        // Step 2: Update OrderIndex of items in list depending on moving up or down
        const updateFrom = isMovingUp
          ? subsequentCollection.right.orderIndex
          : collection.right.orderIndex + 1;

        const updateTo = isMovingUp
          ? collection.right.orderIndex - 1
          : subsequentCollection.right.orderIndex - 1;

        await tx.userCollection.updateMany({
          where: {
            parentID: collection.right.parentID,
            orderIndex: { gte: updateFrom, lte: updateTo },
          },
          data: {
            orderIndex: isMovingUp ? { increment: 1 } : { decrement: 1 },
          },
        });
        // Step 3: Update OrderIndex of collection
        const updatedUserCollection = await tx.userCollection.update({
          where: { id: collection.right.id },
          data: {
            orderIndex: isMovingUp
              ? subsequentCollection.right.orderIndex
              : subsequentCollection.right.orderIndex - 1,
          },
        });
      });

      this.pubsub.publish(
        `user_coll/${collection.right.userUid}/order_updated`,
        {
          userCollection: this.cast(collection.right),
          nextUserCollection: this.cast(subsequentCollection.right),
        },
      );

      return E.right(true);
    } catch (error) {
      return E.left(USER_COLL_REORDERING_FAILED);
    }
  }
}
