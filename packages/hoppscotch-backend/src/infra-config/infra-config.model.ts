import {
  ArgsType,
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { InfraConfigEnum } from 'src/types/InfraConfig';

@ObjectType()
export class InfraConfig {
  @Field({
    description: 'Infra Config Name',
  })
  name: InfraConfigEnum;

  @Field({
    description: 'Infra Config Value',
  })
  value: string;
}

registerEnumType(InfraConfigEnum, {
  name: 'InfraConfigEnum',
});
