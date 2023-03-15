import { Field, ID, ArgsType } from '@nestjs/graphql';
import { PaginationArgs } from 'src/types/input-types.args';
import { ReqType } from 'src/user-history/user-history.model';

@ArgsType()
export class GetUserRequestArgs extends PaginationArgs {
  @Field(() => ID, {
    nullable: true,
    defaultValue: undefined,
    description: 'Collection ID of the user request',
  })
  collectionID?: string;
}

@ArgsType()
export class MoveUserRequestArgs {
  @Field(() => ID, {
    description: 'ID of the collection, where the request is belongs to',
  })
  sourceCollectionID: string;

  @Field(() => ID, {
    description: 'ID of the request being moved',
  })
  requestID: string;

  @Field(() => ID, {
    description: 'ID of the collection, where the request is moving to',
  })
  destinationCollectionID: string;

  @Field(() => ID, {
    nullable: true,
    description:
      'ID of the request that comes after the updated request in its new position',
  })
  nextRequestID: string;
}

@ArgsType()
export class CreateUserRequestArgs {
  @Field(() => ID, {
    description: 'Collection ID of the user request',
  })
  collectionID: string;

  @Field({ description: 'Title of the user request' })
  title: string;

  @Field({ description: 'content/body of the user request' })
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
  title: string;

  @Field({
    nullable: true,
    defaultValue: undefined,
    description: 'content/body of the user request',
  })
  request: string;
}
