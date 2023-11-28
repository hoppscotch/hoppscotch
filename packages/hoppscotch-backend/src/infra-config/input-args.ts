import { Field, InputType } from '@nestjs/graphql';
import { InfraConfigEnumForClient } from 'src/types/InfraConfig';

@InputType()
export class InfraConfigArgs {
  @Field(() => InfraConfigEnumForClient, {
    description: 'Infra Config Name',
  })
  name: InfraConfigEnumForClient;

  @Field({
    description: 'Infra Config Value',
  })
  value: string;
}
