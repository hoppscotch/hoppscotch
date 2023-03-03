import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ReqType } from 'src/user-history/user-history.model';

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
