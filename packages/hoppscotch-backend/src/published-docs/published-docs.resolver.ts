import { UseGuards } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
  Query,
} from '@nestjs/graphql';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { PublishedDocs, PublishedDocsCollection } from './published-docs.model';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { GqlUser } from 'src/decorators/gql-user.decorator';
import {
  CreatePublishedDocsArgs,
  UpdatePublishedDocsArgs,
} from './input-type.args';
import { User } from 'src/user/user.model';
import { PublishedDocsService } from './published-docs.service';
import * as E from 'fp-ts/Either';
import { throwErr } from 'src/utils';
import { GqlTeamMemberGuard } from 'src/team/guards/gql-team-member.guard';
import { OffsetPaginationArgs } from 'src/types/input-types.args';
import { RequiresTeamRole } from 'src/team/decorators/requires-team-role.decorator';
import { TeamAccessRole } from 'src/team/team.model';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => PublishedDocs)
export class PublishedDocsResolver {
  constructor(private readonly publishedDocsService: PublishedDocsService) {}

  // Resolve Fields

  @ResolveField(() => User, {
    description: 'Returns the creator of the published document',
  })
  async creator(@Parent() publishedDocs: PublishedDocs): Promise<User> {
    const creator = await this.publishedDocsService.getPublishedDocsCreator(
      publishedDocs.id,
    );

    if (E.isLeft(creator)) throwErr(creator.left);
    return {
      ...creator.right,
      currentGQLSession: JSON.stringify(creator.right.currentGQLSession),
      currentRESTSession: JSON.stringify(creator.right.currentRESTSession),
    };
  }

  @ResolveField(() => PublishedDocsCollection, {
    description: 'Returns the collection of the published document',
  })
  async collection(
    @Parent() publishedDocs: PublishedDocs,
  ): Promise<PublishedDocsCollection | null> {
    const collection =
      await this.publishedDocsService.getPublishedDocsCollection(
        publishedDocs.id,
      );

    if (E.isLeft(collection)) throwErr(collection.left);
    return collection.right;
  }

  // Queries

  @Query(() => PublishedDocs, {
    description: 'Get a published document by ID',
  })
  @UseGuards(GqlAuthGuard)
  async publishedDoc(
    @GqlUser() user: User,
    @Args({
      name: 'id',
      type: () => ID,
      description: 'Id of the published document to fetch',
    })
    id: string,
  ) {
    const doc = await this.publishedDocsService.getPublishedDocByID(id, user);

    if (E.isLeft(doc)) throwErr(doc.left);
    return doc.right;
  }

  @Query(() => [PublishedDocs], {
    description: 'Get all published documents of a user',
  })
  @UseGuards(GqlAuthGuard)
  async userPublishedDocsList(
    @GqlUser() user: User,
    @Args() args: OffsetPaginationArgs,
  ) {
    const docs = await this.publishedDocsService.getAllUserPublishedDocs(
      user.uid,
      args,
    );
    return docs;
  }

  @Query(() => [PublishedDocs], {
    description: 'Get all published documents',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamAccessRole.VIEWER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.OWNER,
  )
  async teamPublishedDocsList(
    @Args({
      name: 'teamID',
      type: () => ID,
      description: 'Id of the team to add to',
    })
    teamID: string,
    @Args({
      name: 'collectionID',
      type: () => ID,
      description: 'Id of the collection to add to',
      nullable: true,
    })
    collectionID: string | undefined,
    @Args() args: OffsetPaginationArgs,
  ) {
    const docs = await this.publishedDocsService.getAllTeamPublishedDocs(
      teamID,
      collectionID,
      args,
    );
    return docs;
  }

  // Mutations

  @Mutation(() => PublishedDocs, {
    description: 'Create a new published document',
  })
  @UseGuards(GqlAuthGuard)
  async createPublishedDoc(
    @GqlUser() user: User,
    @Args({
      name: 'args',
      type: () => CreatePublishedDocsArgs,
      description: 'Arguments for creating a published document',
    })
    args: CreatePublishedDocsArgs,
  ) {
    const newDoc = await this.publishedDocsService.createPublishedDoc(
      args,
      user,
    );

    if (E.isLeft(newDoc)) throwErr(newDoc.left);
    return newDoc.right;
  }

  @Mutation(() => PublishedDocs, {
    description: 'Update an existing published document',
  })
  @UseGuards(GqlAuthGuard)
  async updatePublishedDoc(
    @GqlUser() user: User,
    @Args({
      name: 'id',
      description: 'ID of the published document to update',
      type: () => ID,
    })
    id: string,
    @Args({
      name: 'args',
      type: () => UpdatePublishedDocsArgs,
      description: 'Arguments for updating a published document',
    })
    args: UpdatePublishedDocsArgs,
  ) {
    const updatedDoc = await this.publishedDocsService.updatePublishedDoc(
      id,
      args,
      user,
    );

    if (E.isLeft(updatedDoc)) throwErr(updatedDoc.left);
    return updatedDoc.right;
  }

  @Mutation(() => Boolean, {
    description: 'Delete a published document by ID',
  })
  @UseGuards(GqlAuthGuard)
  async deletePublishedDoc(
    @GqlUser() user: User,
    @Args({
      name: 'id',
      description: 'ID of the published document to delete',
      type: () => ID,
    })
    id: string,
  ) {
    const result = await this.publishedDocsService.deletePublishedDoc(id, user);

    if (E.isLeft(result)) throwErr(result.left);
    return result.right;
  }
}
