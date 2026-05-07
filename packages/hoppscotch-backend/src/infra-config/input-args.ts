import { Field, InputType } from '@nestjs/graphql';
import { InfraConfigEnum } from 'src/types/InfraConfig';
import { ServiceStatus } from './helper';
import { AuthProvider } from 'src/auth/helper';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class InfraConfigArgs {
  @IsEnum(InfraConfigEnum)
  @Field(() => InfraConfigEnum, {
    description: 'Infra Config Name',
  })
  name: InfraConfigEnum;

  @IsString()
  @Field({
    description: 'Infra Config Value',
  })
  value: string;
}

@InputType()
export class EnableAndDisableSSOArgs {
  @IsEnum(AuthProvider)
  @Field(() => AuthProvider, {
    description: 'Auth Provider',
  })
  provider: AuthProvider;

  @IsEnum(ServiceStatus)
  @Field(() => ServiceStatus, {
    description: 'Auth Provider Status',
  })
  status: ServiceStatus;
}
