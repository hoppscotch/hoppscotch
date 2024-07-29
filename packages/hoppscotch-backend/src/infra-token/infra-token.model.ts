import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class InfraToken {
  @Field(() => ID, {
    description: 'ID of the infra token',
  })
  id: string;

  @Field(() => String, {
    description: 'Label of the infra token',
  })
  label: string;

  @Field(() => Date, {
    description: 'Date when the infra token was created',
  })
  createdOn: Date;

  @Field(() => Date, {
    description: 'Date when the infra token expires',
    nullable: true,
  })
  expiresOn: Date;

  @Field(() => Date, {
    description: 'Date when the infra token was last used',
  })
  lastUsedOn: Date;
}

@ObjectType()
export class CreateInfraTokenResponse {
  @Field(() => String, {
    description: 'The infra token',
  })
  token: string;

  @Field(() => InfraToken, {
    description: 'Infra token info',
  })
  info: InfraToken;
}
