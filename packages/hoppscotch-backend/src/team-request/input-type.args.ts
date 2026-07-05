import { Field, ID, InputType, ArgsType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationArgs } from 'src/types/input-types.args';

@InputType()
export class CreateTeamRequestInput {
  @Field(() => ID, {
    description: 'ID of the team the collection belongs to',
  })
  @IsString()
  @IsNotEmpty()
  teamID: string;

  @Field({
    description: 'JSON string representing the request data',
  })
  @IsString()
  @IsNotEmpty()
  request: string;

  @Field({
    description: 'Displayed title of the request',
  })
  @IsString()
  @IsNotEmpty()
  title: string;
}

@InputType()
export class UpdateTeamRequestInput {
  @Field({
    description: 'JSON string representing the request data',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  request?: string;

  @Field({
    description: 'Displayed title of the request',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  title?: string;
}

@ArgsType()
export class SearchTeamRequestArgs extends PaginationArgs {
  @Field(() => ID, {
    description: 'ID of the team to look in',
  })
  @IsString()
  @IsNotEmpty()
  teamID: string;

  @Field({
    description: 'The title to search for',
  })
  @IsString()
  @IsNotEmpty()
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
  @IsString()
  @IsOptional()
  srcCollID: string;

  @Field(() => ID, {
    description: 'ID of the request to move',
  })
  @IsString()
  @IsNotEmpty()
  requestID: string;

  @Field(() => ID, {
    description: 'ID of the collection, where the request is moving to',
  })
  @IsString()
  @IsNotEmpty()
  destCollID: string;

  @Field(() => ID, {
    nullable: true,
    description:
      'ID of the request that comes after the updated request in its new position',
  })
  @IsString()
  @IsOptional()
  nextRequestID: string;
}

@ArgsType()
export class UpdateLookUpRequestOrderArgs {
  @Field(() => ID, {
    description: 'ID of the collection',
  })
  @IsString()
  @IsNotEmpty()
  collectionID: string;

  @Field(() => ID, {
    nullable: true,
    description:
      'ID of the request that comes after the updated request in its new position',
  })
  @IsString()
  @IsOptional()
  nextRequestID: string;

  @Field(() => ID, {
    description: 'ID of the request to move',
  })
  @IsString()
  @IsNotEmpty()
  requestID: string;
}

@ArgsType()
export class GetTeamRequestInCollectionArgs extends PaginationArgs {
  @Field(() => ID, {
    description: 'ID of the collection to look in',
  })
  @IsString()
  @IsNotEmpty()
  collectionID: string;
}
