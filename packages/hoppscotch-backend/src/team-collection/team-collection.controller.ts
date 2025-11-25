import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TeamCollectionService } from './team-collection.service';
import * as E from 'fp-ts/Either';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RequiresTeamRole } from 'src/team/decorators/requires-team-role.decorator';
import { TeamAccessRole } from '@prisma/client';
import { RESTTeamMemberGuard } from 'src/team/guards/rest-team-member.guard';
import { throwHTTPErr } from 'src/utils';
import { RESTError } from 'src/types/RESTError';
import { INVALID_PARAMS } from 'src/errors';

@UseGuards(ThrottlerBehindProxyGuard)
@Controller({ path: 'team-collection', version: '1' })
export class TeamCollectionController {
  constructor(private readonly teamCollectionService: TeamCollectionService) {}

  @Get('search/:teamID')
  @RequiresTeamRole(
    TeamAccessRole.VIEWER,
    TeamAccessRole.EDITOR,
    TeamAccessRole.OWNER,
  )
  @UseGuards(JwtAuthGuard, RESTTeamMemberGuard)
  async searchByTitle(
    @Query('searchQuery') searchQuery: string,
    @Param('teamID') teamID: string,
    @Query('take') take: string,
    @Query('skip') skip: string,
  ) {
    if (!teamID || !searchQuery) {
      return <RESTError>{
        message: INVALID_PARAMS,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }

    const res = await this.teamCollectionService.searchByTitle(
      searchQuery.trim(),
      teamID,
      parseInt(take),
      parseInt(skip),
    );
    if (E.isLeft(res)) throwHTTPErr(res.left);
    return res.right;
  }
}
