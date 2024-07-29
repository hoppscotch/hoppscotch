import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateInfraTokenResponse, InfraToken } from './infra-token.model';
import { UseGuards } from '@nestjs/common';
import { GqlThrottlerGuard } from 'src/guards/gql-throttler.guard';
import { InfraTokenService } from './infra-token.service';
import { GqlAuthGuard } from 'src/guards/gql-auth.guard';
import { GqlAdminGuard } from 'src/admin/guards/gql-admin.guard';
import { OffsetPaginationArgs } from 'src/types/input-types.args';
import { GqlAdmin } from 'src/admin/decorators/gql-admin.decorator';
import { Admin } from 'src/admin/admin.model';
import * as E from 'fp-ts/Either';
import { throwErr } from 'src/utils';

@UseGuards(GqlThrottlerGuard)
@Resolver(() => InfraToken)
export class InfraTokenResolver {
  constructor(private readonly infraTokenService: InfraTokenService) {}

  /* Query */

  @Query(() => [InfraToken], {
    description: 'Get list of infra tokens',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  infraTokens(@Args() args: OffsetPaginationArgs) {
    return this.infraTokenService.getAll(args.take, args.skip);
  }

  /* Mutations */

  @Mutation(() => CreateInfraTokenResponse, {
    description: 'Create a new infra token',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async createInfraToken(
    @GqlAdmin() admin: Admin,
    @Args({ name: 'label', description: 'Label of the token' }) label: string,
    @Args({
      name: 'expiryInDays',
      description: 'Number of days the token is valid for',
      nullable: true,
    })
    expiryInDays: number,
  ) {
    const infraToken = await this.infraTokenService.create(
      label,
      expiryInDays,
      admin,
    );

    if (E.isLeft(infraToken)) throwErr(infraToken.left);
    return infraToken.right;
  }

  @Mutation(() => Boolean, {
    description: 'Revoke an infra token',
  })
  @UseGuards(GqlAuthGuard, GqlAdminGuard)
  async revokeInfraToken(
    @Args({ name: 'id', type: () => ID, description: 'ID of the infra token' })
    id: string,
  ) {
    const res = await this.infraTokenService.revoke(id);

    if (E.isLeft(res)) throwErr(res.left);
    return res.right;
  }
}
