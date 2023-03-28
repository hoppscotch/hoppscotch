import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ReqType } from 'src/types/RequestTypes';

@ObjectType()
export class UserRequest {
  @Field(() => ID, {
    description: 'ID of the user request',
  })
  id: string;

  @Field(() => ID, {
    description: 'ID of the parent collection ID',
  })
  collectionID: string;

  @Field({
    description: 'Title of the user request',
  })
  title: string;

  @Field({
    description: 'Content/Body of the user request',
  })
  request: string;

  @Field(() => ReqType, {
    description: 'Type (GRAPHQL/REST) of the user request',
  })
  type: ReqType;

  @Field(() => Date, {
    description: 'Date of the user request creation',
  })
  createdOn: Date;
}

@ObjectType()
export class UserRequestReorderData {
  @Field({
    description: 'User request being moved',
  })
  request: UserRequest;

  @Field({
    description:
      'User request succeeding the request being moved in its new position',
    nullable: true,
  })
  nextRequest?: UserRequest;
}
