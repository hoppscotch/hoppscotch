import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class InfraConfig {
  @Field({
    description: 'Infra Config Name',
  })
  name: string;

  @Field({
    description: 'Infra Config Value',
  })
  value: string;
}
