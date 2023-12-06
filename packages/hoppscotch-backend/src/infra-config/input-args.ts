import { Field, InputType } from '@nestjs/graphql';
import { InfraConfigEnumForClient } from 'src/types/InfraConfig';
import { AuthProviderStatus } from './helper';
import { AuthProvider } from 'src/auth/helper';

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

@InputType()
export class EnableAndDisableSSOArgs {
  @Field(() => AuthProvider, {
    description: 'Auth Provider',
  })
  provider: AuthProvider;

  @Field(() => AuthProviderStatus, {
    description: 'Auth Provider Status',
  })
  status: AuthProviderStatus;
}
