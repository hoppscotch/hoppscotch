import { Field, InputType } from '@nestjs/graphql';
import { InfraConfigEnum } from 'src/types/InfraConfig';

@InputType()
export class InfraConfigArgs {
  @Field(() => InfraConfigEnum, {
    description: 'Infra Config Name',
  })
  name: InfraConfigEnum;

  @Field({
    description: 'Infra Config Value',
  })
  value: string;
}
