import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';
import { AuthProvider } from 'src/auth/helper';
import { InfraConfigEnum } from 'src/types/InfraConfig';
import { ServiceStatus } from './helper';

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

registerEnumType(AuthProvider, {
  name: 'AuthProvider',
});

registerEnumType(ServiceStatus, {
  name: 'ServiceStatus',
});
