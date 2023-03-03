import {
  Resolver,
  ResolveField,
  Parent,
  Args,
  Query,
  Mutation,
  Subscription,
  ID,
} from '@nestjs/graphql';
import { TeamCollection } from './team-collection.model';
import { Team, TeamMemberRole } from '../team/team.model';
import { TeamCollectionService } from './team-collection.service';
import { GqlAuthGuard } from '../guards/gql-auth.guard';
import { GqlTeamMemberGuard } from '../team/guards/gql-team-member.guard';
import { UseGuards } from '@nestjs/common';
import { RequiresTeamRole } from '../team/decorators/requires-team-role.decorator';
import { GqlCollectionTeamMemberGuard } from './guards/gql-collection-team-member.guard';
import { PubSubService } from 'src/pubsub/pubsub.service';

@Resolver(() => TeamCollection)
export class TeamCollectionResolver {
  constructor(
    private readonly teamCollectionService: TeamCollectionService,
    private readonly pubsub: PubSubService,
  ) {}

  // Field resolvers
  @ResolveField(() => Team, {
    description: 'Team the collection belongs to',
    complexity: 5,
  })
  team(@Parent() collection: TeamCollection): Promise<Team> {
    return this.teamCollectionService.getTeamOfCollection(collection.id);
  }

  @ResolveField(() => TeamCollection, {
    description:
      'The collection who is the parent of this collection (null if this is root collection)',
    nullable: true,
    complexity: 3,
  })
  parent(@Parent() collection: TeamCollection): Promise<TeamCollection | null> {
    return this.teamCollectionService.getParentOfCollection(collection.id);
  }

  @ResolveField(() => [TeamCollection], {
    description: 'List of children collection',
    complexity: 3,
  })
  children(
    @Parent() collection: TeamCollection,
    @Args({
      name: 'cursor',
      nullable: true,
      description: 'ID of the last returned collection (for pagination)',
    })
    cursor?: string,
  ): Promise<TeamCollection[]> {
    return this.teamCollectionService.getChildrenOfCollection(
      collection.id,
      cursor ?? null,
    );
  }

  // Queries
  // @Query(() => String, {
  //   description:
  //     'Returns the JSON string giving the collections and their contents of the team',
  // })
  // @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  // @RequiresTeamRole(
  //   TeamMemberRole.VIEWER,
  //   TeamMemberRole.EDITOR,
  //   TeamMemberRole.OWNER,
  // )
  // exportCollectionsToJSON(
  //   @Args({ name: 'teamID', description: 'ID of the team', type: () => ID }) teamID: string,
  // ): Promise<string> {
  //   return this.teamCollectionService.exportCollectionsToJSON(teamID);
  // }

  @Query(() => [TeamCollection], {
    description: 'Returns the collections of the team',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.VIEWER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
  )
  rootCollectionsOfTeam(
    @Args({ name: 'teamID', description: 'ID of the team', type: () => ID })
    teamID: string,
    @Args({
      name: 'cursor',
      nullable: true,
      type: () => ID,
      description: 'ID of the last returned collection (for pagination)',
    })
    cursor?: string,
  ): Promise<TeamCollection[]> {
    return this.teamCollectionService.getTeamRootCollections(
      teamID,
      cursor ?? null,
    );
  }

  @Query(() => [TeamCollection], {
    description: 'Returns the collections of the team',
    deprecationReason:
      'Deprecated because of no practical use. Use `rootCollectionsOfTeam` instead.',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.VIEWER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
  )
  collectionsOfTeam(
    @Args({ name: 'teamID', description: 'ID of the team', type: () => ID })
    teamID: string,
    @Args({
      name: 'cursor',
      type: () => ID,
      nullable: true,
      description: 'ID of the last returned collection (for pagination)',
    })
    cursor?: string,
  ): Promise<TeamCollection[]> {
    return this.teamCollectionService.getTeamCollections(
      teamID,
      cursor ?? null,
    );
  }

  @Query(() => TeamCollection, {
    description: 'Get a collection with the given ID or null (if not exists)',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard, GqlCollectionTeamMemberGuard)
  @RequiresTeamRole(
    TeamMemberRole.VIEWER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.OWNER,
  )
  collection(
    @Args({
      name: 'collectionID',
      description: 'ID of the collection',
      type: () => ID,
    })
    collectionID: string,
  ): Promise<TeamCollection | null> {
    return this.teamCollectionService.getCollection(collectionID);
  }

  // Mutations
  @Mutation(() => TeamCollection, {
    description:
      'Creates a collection at the root of the team hierarchy (no parent collection)',
  })
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  createRootCollection(
    @Args({ name: 'teamID', description: 'ID of the team', type: () => ID })
    teamID: string,
    @Args({ name: 'title', description: 'Title of the new collection' })
    title: string,
  ): Promise<TeamCollection> {
    return this.teamCollectionService.createCollection(teamID, title, null);
  }

  // @Mutation(() => TeamCollection, {
  //   description: 'Import collection from user firestore',
  // })
  // @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  // @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  // importCollectionFromUserFirestore(
  //   @Args({
  //     name: 'teamID',
  //     type: () => ID,
  //     description: 'ID of the team to add to',
  //   })
  //   teamID: string,
  //   @Args({
  //     name: 'fbCollectionPath',
  //     description:
  //       'slash separated array indicies path to the target collection',
  //   })
  //   fbCollectionPath: string,
  //   @GqlUser() user: User,
  //   @Args({
  //     name: 'parentCollectionID',
  //     type: () => ID,
  //     description:
  //       'ID to the collection which is going to be parent to the result (null if root)',
  //     nullable: true,
  //   })
  //   parentCollectionID?: string
  // ): Promise<TeamCollection> {
  //   if (parentCollectionID) {
  //     return this.teamCollectionService.importCollectionFromFirestore(
  //       user.uid,
  //       fbCollectionPath,
  //       teamID,
  //       parentCollectionID,
  //     );
  //   } else {
  //     return this.teamCollectionService.importCollectionFromFirestore(
  //       user.uid,
  //       fbCollectionPath,
  //       teamID,
  //     );
  //   }
  // }

  // @Mutation(() => Boolean, {
  //   description: 'Import collections from JSON string to the specified Team',
  // })
  // @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  // @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  // async importCollectionsFromJSON(
  //   @Args({
  //     name: 'teamID',
  //     type: () => ID,
  //     description: 'Id of the team to add to',
  //   })
  //   teamID: string,
  //   @Args({
  //     name: 'jsonString',
  //     description: 'JSON string to import',
  //   })
  //   jsonString: string,
  //   @Args({
  //     name: 'parentCollectionID',
  //     type: () => ID,
  //     description:
  //       'ID to the collection to which to import to (null if to import to the root of team)',
  //     nullable: true,
  //   })
  //   parentCollectionID?: string,
  // ): Promise<boolean> {
  //   await this.teamCollectionService.importCollectionsFromJSON(
  //     jsonString,
  //     teamID,
  //     parentCollectionID ?? null,
  //   );

  //   return true;
  // }

  // @Mutation(() => Boolean, {
  //   description:
  //     'Replace existing collections of a specific team with collections in JSON string',
  // })
  // @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  // @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  // async replaceCollectionsWithJSON(
  //   @Args({
  //     name: 'teamID',
  //     type: () => ID,
  //     description: 'Id of the team to add to',
  //   })
  //   teamID: string,
  //   @Args({
  //     name: 'jsonString',
  //     description: 'JSON string to replace with',
  //   })
  //   jsonString: string,
  //   @Args({
  //     name: 'parentCollectionID',
  //     type: () => ID,
  //     description:
  //       'ID to the collection to which to import to (null if to import to the root of team)',
  //     nullable: true,
  //   })
  //   parentCollectionID?: string,
  // ): Promise<boolean> {
  //   await this.teamCollectionService.replaceCollectionsWithJSON(
  //     jsonString,
  //     teamID,
  //     parentCollectionID ?? null,
  //   );

  //   return true;
  // }

  @Mutation(() => TeamCollection, {
    description: 'Create a collection that has a parent collection',
  })
  @UseGuards(GqlAuthGuard, GqlCollectionTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  async createChildCollection(
    @Args({
      name: 'collectionID',
      type: () => ID,
      description: 'ID of the parent to the new collection',
    })
    collectionID: string,
    @Args({ name: 'childTitle', description: 'Title of the new collection' })
    childTitle: string,
  ): Promise<TeamCollection> {
    const team = await this.teamCollectionService.getTeamOfCollection(
      collectionID,
    );
    return await this.teamCollectionService.createCollection(
      team.id,
      childTitle,
      collectionID,
    );
  }

  @Mutation(() => TeamCollection, {
    description: 'Rename a collection',
  })
  @UseGuards(GqlAuthGuard, GqlCollectionTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  renameCollection(
    @Args({
      name: 'collectionID',
      description: 'ID of the collection',
      type: () => ID,
    })
    collectionID: string,
    @Args({
      name: 'newTitle',
      description: 'The updated title of the collection',
    })
    newTitle: string,
  ): Promise<TeamCollection> {
    return this.teamCollectionService.renameCollection(collectionID, newTitle);
  }

  @Mutation(() => Boolean, {
    description: 'Delete a collection',
  })
  @UseGuards(GqlAuthGuard, GqlCollectionTeamMemberGuard)
  @RequiresTeamRole(TeamMemberRole.OWNER, TeamMemberRole.EDITOR)
  async deleteCollection(
    @Args({
      name: 'collectionID',
      description: 'ID of the collection',
      type: () => ID,
    })
    collectionID: string,
  ): Promise<boolean> {
    this.teamCollectionService.deleteCollection(collectionID);

    return true;
  }

  // Subscriptions
  @Subscription(() => TeamCollection, {
    description:
      'Listen to when a collection has been added to a team. The emitted value is the team added',
    resolve: (value) => value,
  })
  @RequiresTeamRole(
    TeamMemberRole.OWNER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.VIEWER,
  )
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  teamCollectionAdded(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ): AsyncIterator<TeamCollection> {
    return this.pubsub.asyncIterator(`team_coll/${teamID}/coll_added`);
  }

  @Subscription(() => TeamCollection, {
    description: 'Listen to when a collection has been updated.',
    resolve: (value) => value,
  })
  @RequiresTeamRole(
    TeamMemberRole.OWNER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.VIEWER,
  )
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  teamCollectionUpdated(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ): AsyncIterator<TeamCollection> {
    return this.pubsub.asyncIterator(`team_coll/${teamID}/coll_updated`);
  }

  @Subscription(() => ID, {
    description: 'Listen to when a collection has been removed',
    resolve: (value) => value,
  })
  @RequiresTeamRole(
    TeamMemberRole.OWNER,
    TeamMemberRole.EDITOR,
    TeamMemberRole.VIEWER,
  )
  @UseGuards(GqlAuthGuard, GqlTeamMemberGuard)
  teamCollectionRemoved(
    @Args({
      name: 'teamID',
      description: 'ID of the team to listen to',
      type: () => ID,
    })
    teamID: string,
  ): AsyncIterator<TeamCollection> {
    return this.pubsub.asyncIterator(`team_coll/${teamID}/coll_removed`);
  }
}
