import { Injectable } from '@nestjs/common';
import {
  CreatePublishedDocsArgs,
  UpdatePublishedDocsArgs,
} from './input-type.args';
import { PrismaService } from 'src/prisma/prisma.service';
import { PublishedDocs as DbPublishedDocs } from 'src/generated/prisma/client';
import { TeamAccessRole } from 'src/team/team.model';
import { User } from 'src/user/user.model';
import { WorkspaceType } from 'src/types/WorkspaceTypes';
import {
  PUBLISHED_DOCS_CREATION_FAILED,
  PUBLISHED_DOCS_DELETION_FAILED,
  PUBLISHED_DOCS_INVALID_COLLECTION,
  PUBLISHED_DOCS_NOT_FOUND,
  PUBLISHED_DOCS_UPDATE_FAILED,
  TEAM_INVALID_COLL_ID,
  TEAM_INVALID_ID,
  USER_COLL_NOT_FOUND,
} from 'src/errors';
import * as E from 'fp-ts/Either';
import { PublishedDocs } from './published-docs.model';
import { OffsetPaginationArgs } from 'src/types/input-types.args';
import { stringToJson } from 'src/utils';
import { UserCollectionService } from 'src/user-collection/user-collection.service';
import { TeamCollectionService } from 'src/team-collection/team-collection.service';
import { GetPublishedDocsQueryDto, TreeLevel } from './published-docs.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PublishedDocsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userCollectionService: UserCollectionService,
    private readonly teamCollectionService: TeamCollectionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Cast database PublishedDocs to GraphQL PublishedDocs
   */
  private cast(doc: DbPublishedDocs): PublishedDocs {
    return {
      ...doc,
      documentTree: JSON.stringify(doc.documentTree),
      metadata: JSON.stringify(doc.metadata),
      url: `${this.configService.get('VITE_BASE_URL')}/view/${doc.id}/${doc.version}`,
    };
  }

  /**
   * Check if user has access to a team with specific roles
   */
  private async checkTeamAccess(
    teamId: string,
    userUid: string,
    requiredRoles: TeamAccessRole[],
  ): Promise<boolean> {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        members: {
          some: { userUid, role: { in: requiredRoles } },
        },
      },
    });
    return team ? true : false;
  }

  /**
   * Validate workspace access permission and existence
   */
  private async validateWorkspace(
    user: User,
    input: { workspaceType: WorkspaceType; workspaceID: string },
  ) {
    if (input.workspaceType === WorkspaceType.TEAM) {
      if (!input.workspaceID) return E.left(TEAM_INVALID_ID);

      const hasAccess = await this.checkTeamAccess(
        input.workspaceID,
        user.uid,
        [TeamAccessRole.OWNER, TeamAccessRole.EDITOR],
      );

      if (!hasAccess) return E.left(TEAM_INVALID_ID);
    }

    return E.right(true);
  }

  /**
   * Validate collection exists and user has access
   */
  private async validateCollection(
    user: User,
    input: {
      workspaceType: WorkspaceType;
      workspaceID: string;
      collectionID: string;
    },
  ) {
    if (input.workspaceType === WorkspaceType.TEAM) {
      const collection = await this.prisma.teamCollection.findUnique({
        where: { id: input.collectionID, teamID: input.workspaceID },
      });
      return collection
        ? E.right(collection)
        : E.left(PUBLISHED_DOCS_INVALID_COLLECTION);
    } else if (input.workspaceType === WorkspaceType.USER) {
      const collection = await this.prisma.userCollection.findUnique({
        where: { id: input.collectionID, userUid: user.uid },
      });
      return collection
        ? E.right(collection)
        : E.left(PUBLISHED_DOCS_INVALID_COLLECTION);
    }

    return E.left(PUBLISHED_DOCS_INVALID_COLLECTION);
  }

  /**
   * Check if user has access to a published docs with specific roles
   */
  async checkPublishedDocsAccess(
    publishedDocs: DbPublishedDocs,
    userUid: string,
    requiredRoles: TeamAccessRole[] = [
      TeamAccessRole.OWNER,
      TeamAccessRole.EDITOR,
      TeamAccessRole.VIEWER,
    ],
  ): Promise<boolean> {
    if (publishedDocs.workspaceType === WorkspaceType.USER) {
      return publishedDocs.creatorUid === userUid;
    } else if (publishedDocs.workspaceType === WorkspaceType.TEAM) {
      return this.checkTeamAccess(
        publishedDocs.workspaceID,
        userUid,
        requiredRoles,
      );
    }
    return false;
  }

  /**
   * (Field resolver)
   * Get the creator of a mock server
   */
  async getPublishedDocsCreator(id: string) {
    const publishedDocs = await this.prisma.publishedDocs.findUnique({
      where: { id },
    });
    if (!publishedDocs) return E.left(PUBLISHED_DOCS_NOT_FOUND);

    const user = await this.prisma.user.findUnique({
      where: { uid: publishedDocs.creatorUid },
    });

    const creator = user
      ? {
          ...user,
          currentGQLSession: JSON.stringify(user.currentGQLSession),
          currentRESTSession: JSON.stringify(user.currentRESTSession),
        }
      : null;

    return E.right(creator);
  }

  /**
   * (Field resolver)
   * Get the collection of a published document
   */
  async getPublishedDocsCollection(id: string) {
    const publishedDocs = await this.prisma.publishedDocs.findUnique({
      where: { id },
    });
    if (!publishedDocs) return E.left(PUBLISHED_DOCS_NOT_FOUND);

    if (publishedDocs.workspaceType === WorkspaceType.USER) {
      const collection = await this.prisma.userCollection.findUnique({
        where: { id: publishedDocs.collectionID },
      });
      if (!collection) return E.left(PUBLISHED_DOCS_INVALID_COLLECTION);
      return E.right(collection);
    } else if (publishedDocs.workspaceType === WorkspaceType.TEAM) {
      const collection = await this.prisma.teamCollection.findUnique({
        where: { id: publishedDocs.collectionID },
      });
      if (!collection) return E.left(PUBLISHED_DOCS_INVALID_COLLECTION);
      return E.right(collection);
    }

    return E.left(PUBLISHED_DOCS_INVALID_COLLECTION);
  }

  /**
   * Get a published document by ID
   */
  async getPublishedDocByID(id: string, user: User) {
    const publishedDocs = await this.prisma.publishedDocs.findUnique({
      where: { id },
    });
    if (!publishedDocs) return E.left(PUBLISHED_DOCS_NOT_FOUND);

    // Check access permissions
    const hasAccess = await this.checkPublishedDocsAccess(
      publishedDocs,
      user.uid,
    );
    if (!hasAccess) return E.left(PUBLISHED_DOCS_NOT_FOUND);

    return E.right(this.cast(publishedDocs));
  }

  /**
   * Get a published document by ID for public access (unauthenticated)
   * @param id - The ID of the published document
   * @param query - Query parameters specifying tree level
   */
  async getPublishedDocByIDPublic(
    id: string,
    query: GetPublishedDocsQueryDto,
  ): Promise<E.Either<string, PublishedDocs>> {
    const publishedDocs = await this.prisma.publishedDocs.findUnique({
      where: { id },
    });
    if (!publishedDocs) return E.left(PUBLISHED_DOCS_NOT_FOUND);

    // if autoSync is enabled, fetch from the collection directly
    if (publishedDocs.autoSync) {
      const collectionResult =
        publishedDocs.workspaceType === WorkspaceType.USER
          ? await this.userCollectionService.exportUserCollectionToJSONObject(
              publishedDocs.creatorUid,
              publishedDocs.collectionID,
              query.tree === TreeLevel.FULL,
            )
          : await this.teamCollectionService.exportCollectionToJSONObject(
              publishedDocs.workspaceID,
              publishedDocs.collectionID,
              query.tree === TreeLevel.FULL,
            );

      if (E.isLeft(collectionResult)) {
        // Delete the published doc if its collection is missing
        const isCollectionNotFound =
          collectionResult.left === USER_COLL_NOT_FOUND ||
          collectionResult.left === TEAM_INVALID_COLL_ID;

        if (isCollectionNotFound) {
          await this.prisma.publishedDocs.delete({
            where: { id: publishedDocs.id },
          });
        }

        return E.left(collectionResult.left);
      }

      return E.right(
        this.cast({
          ...publishedDocs,
          documentTree: JSON.parse(JSON.stringify(collectionResult.right)),
        }),
      );
    }

    return E.right(this.cast(publishedDocs));
  }

  /**
   * Cleanup orphaned published documents whose collections no longer exist
   */
  private async cleanupOrphanedPublishedDocs<
    T extends { id: string; collectionID: string },
  >(docs: T[], existingCollectionIDs: Set<string>): Promise<T[]> {
    const docsToDelete = docs.filter(
      (doc) => !existingCollectionIDs.has(doc.collectionID),
    );

    if (docsToDelete.length > 0) {
      const idsToDelete = docsToDelete.map((doc) => doc.id);
      this.prisma.publishedDocs.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    return docs.filter((doc) => existingCollectionIDs.has(doc.collectionID));
  }

  /**
   * Get all published documents for a user with pagination
   * @param userUid - The UID of the user
   * @param args - Pagination arguments
   */
  async getAllUserPublishedDocs(userUid: string, args: OffsetPaginationArgs) {
    const docs = await this.prisma.publishedDocs.findMany({
      where: {
        workspaceType: WorkspaceType.USER,
        creatorUid: userUid,
      },
      skip: args.skip,
      take: args.take,
      orderBy: {
        createdOn: 'desc',
      },
    });

    if (docs.length === 0) return [];

    // Cross-check if all collections exist
    const collectionIDs = docs.map((doc) => doc.collectionID);
    const existingCollections = await this.prisma.userCollection.findMany({
      where: {
        id: { in: collectionIDs },
        userUid,
      },
      select: { id: true },
    });

    const existingCollectionIDs = new Set(
      existingCollections.map((col) => col.id),
    );

    const validDocs = await this.cleanupOrphanedPublishedDocs<DbPublishedDocs>(
      docs,
      existingCollectionIDs,
    );

    // Return only docs with existing collections
    return validDocs.map((doc) => this.cast(doc));
  }

  /**
   * Get all published documents for a team and collection with pagination
   */
  async getAllTeamPublishedDocs(
    teamID: string,
    collectionID: string | undefined,
    args: OffsetPaginationArgs,
  ) {
    const docs = await this.prisma.publishedDocs.findMany({
      where: {
        workspaceType: WorkspaceType.TEAM,
        workspaceID: teamID,
        collectionID: collectionID,
      },
      skip: args.skip,
      take: args.take,
      orderBy: {
        createdOn: 'desc',
      },
    });

    if (docs.length === 0) return [];

    // Cross-check if all collections exist
    const collectionIDs = docs.map((doc) => doc.collectionID);
    const existingCollections = await this.prisma.teamCollection.findMany({
      where: {
        id: { in: collectionIDs },
        teamID,
      },
      select: { id: true },
    });

    const existingCollectionIDs = new Set(
      existingCollections.map((col) => col.id),
    );

    const validDocs = await this.cleanupOrphanedPublishedDocs<DbPublishedDocs>(
      docs,
      existingCollectionIDs,
    );

    // Return only docs with existing collections
    return validDocs.map((doc) => this.cast(doc));
  }

  /**
   * Create a new published document
   * @param args - Arguments for creating the published document
   * @param user - The user creating the published document
   */
  async createPublishedDoc(args: CreatePublishedDocsArgs, user: User) {
    try {
      // Validate workspace type and ID
      const workspaceValidation = await this.validateWorkspace(user, {
        workspaceType: args.workspaceType,
        workspaceID: args.workspaceID,
      });
      if (E.isLeft(workspaceValidation)) {
        return E.left(workspaceValidation.left);
      }

      // Validate collection exists and user has access
      const collectionValidation = await this.validateCollection(user, {
        workspaceType: args.workspaceType,
        workspaceID: args.workspaceID,
        collectionID: args.collectionID,
      });
      if (E.isLeft(collectionValidation)) {
        return E.left(collectionValidation.left);
      }

      // Parse metadata
      const metadata = stringToJson(args.metadata);
      if (E.isLeft(metadata)) return E.left(metadata.left);

      // Create published document
      const newPublishedDoc = await this.prisma.publishedDocs.create({
        data: {
          title: args.title,
          collectionID: args.collectionID,
          creatorUid: user.uid,
          version: args.version,
          autoSync: args.autoSync,
          workspaceType: args.workspaceType,
          workspaceID:
            args.workspaceType === WorkspaceType.TEAM
              ? args.workspaceID
              : user.uid,
          metadata: metadata.right,
        },
      });

      return E.right(this.cast(newPublishedDoc));
    } catch (error) {
      console.error('Error creating published document:', error);
      return E.left(PUBLISHED_DOCS_CREATION_FAILED);
    }
  }

  /**
   * Update an existing published document
   * @param id - The ID of the published document to update
   * @param args - Arguments for updating the published document
   * @param user - The user updating the published document
   */
  async updatePublishedDoc(
    id: string,
    args: UpdatePublishedDocsArgs,
    user: User,
  ): Promise<E.Either<string, PublishedDocs>> {
    try {
      const publishedDocs = await this.prisma.publishedDocs.findUnique({
        where: { id },
      });
      if (!publishedDocs) return E.left(PUBLISHED_DOCS_NOT_FOUND);

      // Check access permissions based on workspace type (only OWNER and EDITOR can update)
      const hasAccess = await this.checkPublishedDocsAccess(
        publishedDocs,
        user.uid,
        [TeamAccessRole.OWNER, TeamAccessRole.EDITOR],
      );
      if (!hasAccess) return E.left(PUBLISHED_DOCS_UPDATE_FAILED);

      //Parse metadata if provided
      let metadata: E.Either<string, any>;
      if (args.metadata) {
        metadata = stringToJson(args.metadata);
        if (E.isLeft(metadata)) return E.left(metadata.left);
      }

      // Update published document
      const updatedPublishedDoc = await this.prisma.publishedDocs.update({
        where: { id },
        data: {
          title: args.title,
          version: args.version,
          autoSync: args.autoSync,
          metadata:
            metadata && E.isRight(metadata) ? metadata.right : undefined,
        },
      });

      return E.right(this.cast(updatedPublishedDoc));
    } catch (error) {
      console.error('Error updating published document:', error);
      return E.left(PUBLISHED_DOCS_UPDATE_FAILED);
    }
  }

  /** Delete a published document
   * @param id - The ID of the published document to delete
   * @param user - The user deleting the published document
   */
  async deletePublishedDoc(id: string, user: User) {
    try {
      const publishedDocs = await this.prisma.publishedDocs.findUnique({
        where: { id },
      });
      if (!publishedDocs) return E.left(PUBLISHED_DOCS_NOT_FOUND);

      // Check access permissions based on workspace type (only OWNER and EDITOR can update)
      const hasAccess = await this.checkPublishedDocsAccess(
        publishedDocs,
        user.uid,
        [TeamAccessRole.OWNER, TeamAccessRole.EDITOR],
      );
      if (!hasAccess) return E.left(PUBLISHED_DOCS_DELETION_FAILED);

      await this.prisma.publishedDocs.delete({
        where: { id },
      });

      return E.right(true);
    } catch (error) {
      console.error('Error deleting published document:', error);
      return E.left(PUBLISHED_DOCS_DELETION_FAILED);
    }
  }
}
