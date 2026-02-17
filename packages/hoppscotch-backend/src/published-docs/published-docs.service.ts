import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
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
  PUBLISHED_DOCS_INVALID_ENVIRONMENT,
  PUBLISHED_DOCS_NOT_FOUND,
  PUBLISHED_DOCS_UPDATE_FAILED,
  TEAM_INVALID_COLL_ID,
  TEAM_INVALID_ID,
  USER_COLL_NOT_FOUND,
} from 'src/errors';
import * as E from 'fp-ts/Either';
import { PublishedDocs, PublishedDocsVersion } from './published-docs.model';
import { OffsetPaginationArgs } from 'src/types/input-types.args';
import { stringToJson } from 'src/utils';
import { UserCollectionService } from 'src/user-collection/user-collection.service';
import { TeamCollectionService } from 'src/team-collection/team-collection.service';
import { ConfigService } from '@nestjs/config';
import { PrismaError } from 'src/prisma/prisma-error-codes';
import { CollectionFolder } from 'src/types/CollectionFolder';
import { plainToInstance } from 'class-transformer';
import { JsonValue } from '@prisma/client/runtime/client';

@Injectable()
export class PublishedDocsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userCollectionService: UserCollectionService,
    private readonly teamCollectionService: TeamCollectionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get or generate slug for a collection
   * - For existing published docs with the same collectionID, reuse the slug
   * - For new collections, generate a new UUID-based slug
   */
  private async getOrGenerateSlug(
    collectionID: string,
    workspaceType: WorkspaceType,
    workspaceID: string,
  ): Promise<string> {
    // Check if there's already a published doc for this collection
    const existingDoc = await this.prisma.publishedDocs.findFirst({
      where: {
        collectionID,
        workspaceType,
        workspaceID,
      },
      orderBy: {
        createdOn: 'asc', // Get the oldest one
      },
    });

    // If exists, reuse its slug
    if (existingDoc) {
      return existingDoc.slug;
    }

    // Otherwise, generate a new slug using crypto.randomUUID()
    return crypto.randomUUID();
  }

  /**
   * Cast database PublishedDocs to GraphQL PublishedDocs
   */
  private cast(
    doc: DbPublishedDocs,
    versions: PublishedDocsVersion[] = [],
  ): PublishedDocs {
    return {
      ...doc,
      versions,
      documentTree: JSON.stringify(doc.documentTree),
      metadata: JSON.stringify(doc.metadata),
      environmentName: doc.environmentName ?? null,
      environmentVariables: doc.environmentVariables
        ? JSON.stringify(doc.environmentVariables)
        : null,
      url: `${this.configService.get('VITE_BASE_URL')}/view/${doc.slug}/${doc.version}`,
    };
  }

  /**
   * Fetch environment by ID based on workspace type
   * Returns the environment name and variables, or an error if not found
   */
  private async fetchEnvironment(
    environmentID: string,
    workspaceType: WorkspaceType,
    workspaceID: string,
  ): Promise<E.Either<string, { name: string; variables: JsonValue } | null>> {
    if (workspaceType === WorkspaceType.TEAM) {
      const env = await this.prisma.teamEnvironment.findFirst({
        where: { id: environmentID, teamID: workspaceID },
      });
      if (!env) return E.left(PUBLISHED_DOCS_INVALID_ENVIRONMENT);
      return E.right({ name: env.name, variables: env.variables });
    } else if (workspaceType === WorkspaceType.USER) {
      const env = await this.prisma.userEnvironment.findFirst({
        where: { id: environmentID, userUid: workspaceID },
      });
      if (!env) return E.left(PUBLISHED_DOCS_INVALID_ENVIRONMENT);
      return E.right({ name: env.name ?? '', variables: env.variables });
    }

    return E.left(PUBLISHED_DOCS_INVALID_ENVIRONMENT);
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
   * (Field resolver)
   * Get all versions of a published document by slug
   */
  async getPublishedDocsVersions(slug: string) {
    const allVersions = await this.prisma.publishedDocs.findMany({
      where: { slug },
      orderBy: [{ autoSync: 'desc' }, { createdOn: 'desc' }],
    });

    if (allVersions.length === 0) return E.left(PUBLISHED_DOCS_NOT_FOUND);

    return E.right(allVersions.map((doc) => this.cast(doc)));
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
   * Get a published document by slug and version for public access (unauthenticated)
   * @param slug - The slug of the published document
   * @param version - The version of the published document
   */
  async getPublishedDocBySlugPublic(
    slug: string,
    version: string | null,
  ): Promise<E.Either<string, PublishedDocs>> {
    const allVersions = await this.getPublishedDocsVersions(slug);
    if (E.isLeft(allVersions)) return E.left(allVersions.left);

    const publishedDocs = await this.prisma.publishedDocs.findUnique({
      where: {
        slug_version: {
          slug,
          version: version ? version : allVersions.right[0].version, // If version is not specified, get the latest version
        },
      },
    });
    if (!publishedDocs) return E.left(PUBLISHED_DOCS_NOT_FOUND);

    let docToReturn = publishedDocs;

    // if autoSync is enabled, fetch from the collection directly
    if (publishedDocs.autoSync) {
      const collectionResult =
        publishedDocs.workspaceType === WorkspaceType.USER
          ? await this.userCollectionService.exportUserCollectionToJSONObject(
              publishedDocs.creatorUid,
              publishedDocs.collectionID,
            )
          : await this.teamCollectionService.exportCollectionToJSONObject(
              publishedDocs.workspaceID,
              publishedDocs.collectionID,
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

      // Re-fetch environment if environmentID is set
      let environmentName = publishedDocs.environmentName;
      let environmentVariables = publishedDocs.environmentVariables;

      if (publishedDocs.environmentID) {
        const workspaceID =
          publishedDocs.workspaceType === WorkspaceType.USER
            ? publishedDocs.creatorUid
            : publishedDocs.workspaceID;

        const envResult = await this.fetchEnvironment(
          publishedDocs.environmentID,
          publishedDocs.workspaceType as WorkspaceType,
          workspaceID,
        );
        if (E.isLeft(envResult)) return E.left(envResult.left);

        if (E.isRight(envResult) && envResult.right) {
          environmentName = envResult.right.name;
          environmentVariables = envResult.right.variables;
        }
      }

      docToReturn = {
        ...publishedDocs,
        documentTree: collectionResult.right as unknown as JsonValue,
        environmentName,
        environmentVariables,
      };
    }

    return E.right(
      plainToInstance(
        PublishedDocs,
        this.cast(docToReturn, allVersions.right),
        { excludeExtraneousValues: true, enableCircularCheck: true },
      ),
    );
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
      await this.prisma.publishedDocs.deleteMany({
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
  async createPublishedDoc(
    args: CreatePublishedDocsArgs,
    user: User,
    retryCount: number = 0,
  ): Promise<E.Either<string, PublishedDocs>> {
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

      // Get or generate slug for this collection
      const workspaceID =
        args.workspaceType === WorkspaceType.TEAM ? args.workspaceID : user.uid;

      // Get or generate slug
      const slug = await this.getOrGenerateSlug(
        args.collectionID,
        args.workspaceType,
        workspaceID,
      );

      let documentTree: CollectionFolder | null = null;
      // If autoSync is disabled, fetch the latest collection data for snapshot
      if (!args.autoSync) {
        const collectionResult =
          args.workspaceType === WorkspaceType.USER
            ? await this.userCollectionService.exportUserCollectionToJSONObject(
                user.uid,
                args.collectionID,
              )
            : await this.teamCollectionService.exportCollectionToJSONObject(
                args.workspaceID,
                args.collectionID,
              );

        if (E.isLeft(collectionResult)) {
          return E.left(collectionResult.left);
        }

        documentTree = collectionResult.right;
      }

      // Fetch environment if environmentID is provided
      let environmentName: string | null = null;
      let environmentVariables: JsonValue | null = null;

      if (args.environmentID) {
        const envResult = await this.fetchEnvironment(
          args.environmentID,
          args.workspaceType,
          workspaceID,
        );
        if (E.isLeft(envResult)) return E.left(envResult.left);
        if (envResult.right) {
          environmentName = envResult.right.name;
          environmentVariables = envResult.right.variables;
        }
      }

      // Attempt to create the published document
      const newPublishedDoc = await this.prisma.publishedDocs.create({
        data: {
          title: args.title,
          slug: slug,
          collectionID: args.collectionID,
          creatorUid: user.uid,
          version: args.version,
          autoSync: args.autoSync,
          workspaceType: args.workspaceType,
          workspaceID: workspaceID,
          documentTree: documentTree as unknown as JsonValue,
          metadata: metadata.right,
          environmentID: args.environmentID ?? null,
          environmentName,
          environmentVariables,
        },
      });

      return E.right(this.cast(newPublishedDoc));
    } catch (error) {
      // Check if it's a unique constraint violation on [slug, version]
      // Allow up to 3 total attempts (initial + 2 retries)
      const maxRetries = 2;
      if (
        error.code === PrismaError.UNIQUE_CONSTRAINT_VIOLATION &&
        retryCount < maxRetries
      ) {
        // Race condition detected: retry with fresh slug generation
        return this.createPublishedDoc(args, user, retryCount + 1);
      }

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

      // Determine documentTree based on autoSync value
      let documentTree: CollectionFolder | null | undefined = undefined; // undefined = no change

      if (args.autoSync === true) {
        // autoSync enabled → clear documentTree (will be generated dynamically)
        documentTree = null;
      } else if (args.autoSync === false && publishedDocs.autoSync === true) {
        // Switching from autoSync true → false: generate a snapshot of the collection
        const collectionResult =
          publishedDocs.workspaceType === WorkspaceType.USER
            ? await this.userCollectionService.exportUserCollectionToJSONObject(
                publishedDocs.creatorUid,
                publishedDocs.collectionID,
              )
            : await this.teamCollectionService.exportCollectionToJSONObject(
                publishedDocs.workspaceID,
                publishedDocs.collectionID,
              );

        if (E.isLeft(collectionResult)) {
          return E.left(collectionResult.left);
        }

        documentTree = collectionResult.right;
      }

      // Handle environment update if environmentID is provided
      let environmentName: string | null | undefined = undefined; // undefined = no change
      let environmentVariables: JsonValue | undefined = undefined;
      let environmentID: string | null | undefined = undefined;

      if (args.environmentID !== undefined) {
        if (args.environmentID === null) {
          // Explicitly removing environment
          environmentID = null;
          environmentName = null;
          environmentVariables = null;
        } else {
          // Fetch environment data
          const envResult = await this.fetchEnvironment(
            args.environmentID,
            publishedDocs.workspaceType as WorkspaceType,
            publishedDocs.workspaceID,
          );
          if (E.isLeft(envResult)) return E.left(envResult.left);
          if (envResult.right) {
            environmentID = args.environmentID;
            environmentName = envResult.right.name;
            environmentVariables = envResult.right.variables;
          }
        }
      }

      // Update published document
      const updatedPublishedDoc = await this.prisma.publishedDocs.update({
        where: { id },
        data: {
          title: args.title,
          version: args.version,
          autoSync: args.autoSync,
          documentTree:
            documentTree !== undefined
              ? (documentTree as unknown as JsonValue)
              : undefined,
          metadata:
            metadata && E.isRight(metadata) ? metadata.right : undefined,
          environmentID:
            environmentID !== undefined ? environmentID : undefined,
          environmentName:
            environmentName !== undefined ? environmentName : undefined,
          environmentVariables:
            environmentVariables !== undefined
              ? environmentVariables
              : undefined,
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
