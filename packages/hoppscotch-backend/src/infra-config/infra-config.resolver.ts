import { UseGuards } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { InfraConfig } from './infra-config.model';
import { InfraConfigService } from './infra-config.service';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => InfraConfig)
export class InfraConfigResolver {
  constructor(private infraConfigService: InfraConfigService) {}

  @Query(() => Boolean, {
    description: 'Check if the SMTP is enabled or not',
  })
  @UseGuards(GqlAuthGuard)
  isSMTPEnabled() {
    return this.infraConfigService.isSMTPEnabled();
  }
}
