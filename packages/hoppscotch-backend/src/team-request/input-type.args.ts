import { Field, ID, InputType, ArgsType } from '@nestjs/graphql';
import { PaginationArgs } from 'src/types/input-types.args';

@InputType()
export class CreateTeamRequestInput {
  @Field(() => ID, {
    description: 'ID of the team the collection belongs to',
  })
  teamID: string;

  @Field({
    description: 'JSON string representing the request data',
  })
  request: string;

  @Field({
    description: 'Displayed title of the request',
  })
  title: string;
}

@InputType()
export class UpdateTeamRequestInput {
  @Field({
    description: 'JSON string representing the request data',
    nullable: true,
  })
  request?: string;

  @Field({
    description: 'Displayed title of the request',
    nullable: true,
  })
  title?: string;
}

@ArgsType()
export class SearchTeamRequestArgs extends PaginationArgs {
  @Field(() => ID, {
    description: 'ID of the team to look in',
  })
  teamID: string;

  @Field({
    description: 'The title to search for',
  })
  searchTerm: string;
}

@ArgsType()
export class MoveTeamRequestArgs {
  @Field(() => ID, {
    // for backward compatibility, this field is nullable and undefined as default
    nullable: true,
    defaultValue: undefined,
    description: 'ID of the collection, the request belong to',
  })
  srcCollID: string;

  @Field(() => ID, {
    description: 'ID of the request to move',
  })
  requestID: string;

  @Field(() => ID, {
    description: 'ID of the collection, where the request is moving to',
  })
  destCollID: string;

  @Field(() => ID, {
    nullable: true,
    description:
      'ID of the request that comes after the updated request in its new position',
  })
  nextRequestID: string;
}

@ArgsType()
export class UpdateLookUpRequestOrderArgs {
  @Field(() => ID, {
    description: 'ID of the collection',
  })
  collectionID: string;

  @Field(() => ID, {
    nullable: true,
    description:
      'ID of the request that comes after the updated request in its new position',
  })
  nextRequestID: string;

  @Field(() => ID, {
    description: 'ID of the request to move',
  })
  requestID: string;
}

@ArgsType()
export class GetTeamRequestInCollectionArgs extends PaginationArgs {
  @Field(() => ID, {
    description: 'ID of the collection to look in',
  })
  collectionID: string;
}
