import { Field, ID, ArgsType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationArgs } from 'src/types/input-types.args';
import { ReqType } from 'src/types/RequestTypes';

@ArgsType()
export class GetUserRequestArgs extends PaginationArgs {
  @Field(() => ID, {
    nullable: true,
    defaultValue: undefined,
    description: 'Collection ID of the user request',
  })
  @IsString()
  @IsOptional()
  collectionID?: string;
}

@ArgsType()
export class MoveUserRequestArgs {
  @Field(() => ID, {
    description: 'ID of the collection, where the request is belongs to',
  })
  @IsString()
  @IsNotEmpty()
  sourceCollectionID: string;

  @Field(() => ID, {
    description: 'ID of the request being moved',
  })
  @IsString()
  @IsNotEmpty()
  requestID: string;

  @Field(() => ID, {
    description: 'ID of the collection, where the request is moving to',
  })
  @IsString()
  @IsNotEmpty()
  destinationCollectionID: string;

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
export class CreateUserRequestArgs {
  @Field(() => ID, {
    description: 'Collection ID of the user request',
  })
  @IsString()
  @IsNotEmpty()
  collectionID: string;

  @Field({ description: 'Title of the user request' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @Field({ description: 'content/body of the user request' })
  @IsString()
  @IsNotEmpty()
  request: string;

  type: ReqType;
}

@ArgsType()
export class UpdateUserRequestArgs {
  @Field({
    nullable: true,
    defaultValue: undefined,
    description: 'Title of the user request',
  })
  @IsString()
  @IsOptional()
  title: string;

  @Field({
    nullable: true,
    defaultValue: undefined,
    description: 'content/body of the user request',
  })
  @IsString()
  @IsOptional()
  request: string;
}
