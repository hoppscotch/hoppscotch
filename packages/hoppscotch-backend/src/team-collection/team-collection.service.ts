import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Team } from '../team/team.model';
import { TeamCollection } from './team-collection.model';
// import { FirebaseService } from '../firebase/firebase.service';
import {
  TEAM_USER_NO_FB_SYNCDATA,
  TEAM_FB_COLL_PATH_RESOLVE_FAIL,
  TEAM_COLL_SHORT_TITLE,
  TEAM_COLL_INVALID_JSON,
  TEAM_INVALID_COLL_ID,
} from '../errors';
import { PubSubService } from '../pubsub/pubsub.service';
import { throwErr } from 'src/utils';
import { pipe } from 'fp-ts/function';
import * as TO from 'fp-ts/TaskOption';

@Injectable()
export class TeamCollectionService {
  constructor(
    private readonly prisma: PrismaService,
    // private readonly fb: FirebaseService,
    private readonly pubsub: PubSubService,
  ) {}

  // TODO: Change return type
  // private generatePrismaQueryObjForFBCollFolder(
  //   folder: FBCollectionFolder,
  //   teamID: string,
  // ): any {
  //   return {
  //     title: folder.name,
  //     team: {
  //       connect: {
  //         id: teamID,
  //       },
  //     },
  //     requests: {
  //       create: folder.requests.map((r) => ({
  //         title: r.name,
  //         team: {
  //           connect: {
  //             id: teamID,
  //           },
  //         },
  //         request: r,
  //       })),
  //     },
  //     children: {
  //       create: folder.folders.map((f) =>
  //         this.generatePrismaQueryObjForFBCollFolder(f, teamID),
  //       ),
  //     },
  //   };
  // }

  // async importCollectionFromFirestore(
  //   userUid: string,
  //   fbCollectionPath: string,
  //   teamID: string,
  //   parentCollectionID?: string,
  // ): Promise<TeamCollection> {
  //   const syncDoc = await this.fb.firestore
  //     .doc(`users/${userUid}/collections/sync`)
  //     .get();

  //   if (!syncDoc.exists) throw new Error(TEAM_USER_NO_FB_SYNCDATA);

  //   const doc = syncDoc.data();

  //   if (!doc) throw new Error(TEAM_USER_NO_FB_SYNCDATA);

  //   // The 'target' variable will have the intended path to reach
  //   let target: FBCollectionFolder | null | undefined;
  //   try {
  //     const indexPaths = fbCollectionPath.split('/').map((x) => parseInt(x));
  //     target = doc.collection[indexPaths.shift() as number];
  //     while (indexPaths.length > 0)
  //     {
  //       const index = indexPaths.shift() as number;
  //       target = target?.folders[index];
  //     }
  //   } catch (e) {
  //     target = null;
  //   }

  //   if (!target) throw new Error(TEAM_FB_COLL_PATH_RESOLVE_FAIL);

  //   const queryGen = this.generatePrismaQueryObjForFBCollFolder(target, teamID);

  //   let result: TeamCollection;

  //   if (parentCollectionID) {
  //     result = await this.prisma.teamCollection.create({
  //       data: {
  //         ...queryGen,
  //         parent: {
  //           connect: {
  //             id: parentCollectionID,
  //           },
  //         },
  //       },
  //     });
  //   } else {
  //     result = await this.prisma.teamCollection.create({
  //       data: queryGen,
  //     });
  //   }

  //   this.pubsub.publish(`team_coll/${teamID}/coll_added`, result);

  //   return result;
  // }

  // private async exportCollectionToJSONObject(
  //   teamID: string,
  //   collectionID: string,
  // ): Promise<FBCollectionFolder> {
  //   const collection = await this.getCollection(collectionID);

  //   if (!collection) throw new Error(TEAM_INVALID_COLL_ID)

  //   const childrenCollection = await this.prisma.teamCollection.findMany({
  //     where: {
  //       teamID,
  //       parentID: collectionID,
  //     },
  //   });

  //   const childrenCollectionObjects = await Promise.all(
  //     childrenCollection.map((coll) =>
  //       this.exportCollectionToJSONObject(teamID, coll.id),
  //     ),
  //   );

  //   const requests = await this.prisma.teamRequest.findMany({
  //     where: {
  //       teamID,
  //       collectionID,
  //     },
  //   });

  //   return {
  //     name: collection.title,
  //     folders: childrenCollectionObjects,
  //     requests: requests.map((x) => x.request),
  //   };
  // }

  // async exportCollectionsToJSON(teamID: string): Promise<string> {
  //   const rootCollections = await this.prisma.teamCollection.findMany({
  //     where: {
  //       teamID,
  //       parentID: null,
  //     },
  //   });

  //   const rootCollectionObjects = await Promise.all(
  //     rootCollections.map((coll) =>
  //       this.exportCollectionToJSONObject(teamID, coll.id),
  //     ),
  //   );

  //   return JSON.stringify(rootCollectionObjects);
  // }

  // async importCollectionsFromJSON(
  //   jsonString: string,
  //   destTeamID: string,
  //   destCollectionID: string | null,
  // ): Promise<void> {
  //   let collectionsList: FBCollectionFolder[];

  //   try {
  //     collectionsList = JSON.parse(jsonString);

  //     if (!Array.isArray(collectionsList))
  //       throw new Error(TEAM_COLL_INVALID_JSON);
  //   } catch (e) {
  //     throw new Error(TEAM_COLL_INVALID_JSON);
  //   }

  //   const queryList = collectionsList.map((x) =>
  //     this.generatePrismaQueryObjForFBCollFolder(x, destTeamID),
  //   );

  //   let requests: TeamCollection[];

  //   if (destCollectionID) {
  //     requests = await this.prisma.$transaction(
  //       queryList.map((x) =>
  //         this.prisma.teamCollection.create({
  //           data: {
  //             ...x,
  //             parent: {
  //               connect: {
  //                 id: destCollectionID,
  //               },
  //             },
  //           },
  //         }),
  //       ),
  //     );
  //   } else {
  //     requests = await this.prisma.$transaction(
  //       queryList.map((x) =>
  //         this.prisma.teamCollection.create({
  //           data: {
  //             ...x,
  //           },
  //         }),
  //       ),
  //     );
  //   }

  //   requests.forEach((x) =>
  //     this.pubsub.publish(`team_coll/${destTeamID}/coll_added`, x),
  //   );
  // }

  // async replaceCollectionsWithJSON(
  //   jsonString: string,
  //   destTeamID: string,
  //   destCollectionID: string | null,
  // ): Promise<void> {
  //   let collectionsList: FBCollectionFolder[];

  //   try {
  //     collectionsList = JSON.parse(jsonString);

  //     if (!Array.isArray(collectionsList))
  //       throw new Error(TEAM_COLL_INVALID_JSON);
  //   } catch (e) {
  //     throw new Error(TEAM_COLL_INVALID_JSON);
  //   }
  //   const childrenCollection = await this.prisma.teamCollection.findMany({
  //     where: {
  //       teamID: destTeamID,
  //       parentID: destCollectionID,
  //     },
  //   });

  //   await Promise.all(
  //     childrenCollection.map(async (coll) => {
  //       await this.deleteCollection(coll.id);
  //     }),
  //   );

  //   const queryList = collectionsList.map((x) =>
  //     this.generatePrismaQueryObjForFBCollFolder(x, destTeamID),
  //   );

  //   let requests: TeamCollection[];

  //   if (destCollectionID) {
  //     requests = await this.prisma.$transaction(
  //       queryList.map((x) =>
  //         this.prisma.teamCollection.create({
  //           data: {
  //             ...x,
  //             parent: {
  //               connect: {
  //                 id: destCollectionID,
  //               },
  //             },
  //           },
  //         }),
  //       ),
  //     );
  //   } else {
  //     requests = await this.prisma.$transaction(
  //       queryList.map((x) =>
  //         this.prisma.teamCollection.create({
  //           data: {
  //             ...x,
  //           },
  //         }),
  //       ),
  //     );
  //   }

  //   requests.forEach((x) =>
  //     this.pubsub.publish(`team_coll/${destTeamID}/coll_added`, x),
  //   );
  // }

  async getTeamOfCollection(collectionID: string): Promise<Team> {
    const { team } =
      (await this.prisma.teamCollection.findUnique({
        where: {
          id: collectionID,
        },
        include: {
          team: true,
        },
      })) ?? throwErr(TEAM_INVALID_COLL_ID);

    return team;
  }

  async getParentOfCollection(
    collectionID: string,
  ): Promise<TeamCollection | null> {
    const { parent } =
      (await this.prisma.teamCollection.findUnique({
        where: {
          id: collectionID,
        },
        include: {
          parent: true,
        },
      })) ?? throwErr(TEAM_INVALID_COLL_ID);

    return parent;
  }

  getChildrenOfCollection(
    collectionID: string,
    cursor: string | null,
  ): Promise<TeamCollection[]> {
    if (!cursor) {
      return this.prisma.teamCollection.findMany({
        take: 10,
        where: {
          parent: {
            id: collectionID,
          },
        },
      });
    } else {
      return this.prisma.teamCollection.findMany({
        take: 10,
        skip: 1,
        cursor: {
          id: cursor,
        },
        where: {
          parent: {
            id: collectionID,
          },
        },
      });
    }
  }

  async getTeamRootCollections(
    teamID: string,
    cursor: string | null,
  ): Promise<TeamCollection[]> {
    if (!cursor) {
      return await this.prisma.teamCollection.findMany({
        take: 10,
        where: {
          teamID,
          parentID: null,
        },
      });
    } else {
      return this.prisma.teamCollection.findMany({
        take: 10,
        skip: 1,
        cursor: {
          id: cursor,
        },
        where: {
          teamID,
          parentID: null,
        },
      });
    }
  }

  getTeamCollections(
    teamID: string,
    cursor: string | null,
  ): Promise<TeamCollection[]> {
    if (!cursor) {
      return this.prisma.teamCollection.findMany({
        take: 10,
        where: {
          teamID,
        },
      });
    } else {
      return this.prisma.teamCollection.findMany({
        take: 10,
        skip: 1,
        cursor: {
          id: cursor,
        },
        where: {
          teamID,
        },
      });
    }
  }

  getCollection(collectionID: string): Promise<TeamCollection | null> {
    return this.prisma.teamCollection.findUnique({
      where: {
        id: collectionID,
      },
    });
  }

  getCollectionTO(collectionID: string): TO.TaskOption<TeamCollection> {
    return pipe(
      TO.fromTask(() => this.getCollection(collectionID)),
      TO.chain(TO.fromNullable),
    );
  }

  async createCollection(
    teamID: string,
    title: string,
    parentID: string | null,
  ): Promise<TeamCollection> {
    if (title.length < 3) {
      throw new Error(TEAM_COLL_SHORT_TITLE);
    }

    let result: TeamCollection;

    if (!parentID) {
      result = await this.prisma.teamCollection.create({
        data: {
          title: title,
          team: {
            connect: {
              id: teamID,
            },
          },
        },
      });
    } else {
      result = await this.prisma.teamCollection.create({
        data: {
          title: title,
          team: {
            connect: {
              id: teamID,
            },
          },
          parent: {
            connect: {
              id: parentID,
            },
          },
        },
      });
    }

    this.pubsub.publish(`team_coll/${teamID}/coll_added`, result);

    return result;
  }

  async renameCollection(
    collectionID: string,
    newTitle: string,
  ): Promise<TeamCollection> {
    if (newTitle.length < 3) {
      throw new Error(TEAM_COLL_SHORT_TITLE);
    }

    const res = await this.prisma.teamCollection.update({
      where: {
        id: collectionID,
      },
      data: {
        title: newTitle,
      },
    });

    this.pubsub.publish(`team_coll/${res.teamID}/coll_updated`, res);

    return res;
  }

  async deleteCollection(collectionID: string): Promise<void> {
    const coll =
      (await this.getCollection(collectionID)) ??
      throwErr(TEAM_INVALID_COLL_ID);

    const childrenCollection = await this.prisma.teamCollection.findMany({
      where: {
        parentID: coll.id,
      },
    });

    await Promise.all(
      childrenCollection.map((coll) => this.deleteCollection(coll.id)),
    );

    await this.prisma.teamRequest.deleteMany({
      where: {
        collectionID: coll.id,
      },
    });

    await this.prisma.teamCollection.delete({
      where: {
        id: collectionID,
      },
    });

    this.pubsub.publish(`team_coll/${coll.teamID}/coll_removed`, coll);
  }
}
