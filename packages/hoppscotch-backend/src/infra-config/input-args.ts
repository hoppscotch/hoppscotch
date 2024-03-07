import { Field, InputType } from '@nestjs/graphql';
import { InfraConfigEnum } from 'src/types/InfraConfig';
import { ServiceStatus } from './helper';
import { AuthProvider } from 'src/auth/helper';

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

@InputType()
export class EnableAndDisableSSOArgs {
  @Field(() => AuthProvider, {
    description: 'Auth Provider',
  })
  provider: AuthProvider;

  @Field(() => ServiceStatus, {
    description: 'Auth Provider Status',
  })
  status: ServiceStatus;
}
